// Dynoland glass helper. Compiled at startup by Windows PowerShell
// (Add-Type), so it must stay within C# 5 syntax.
//
// The island can't see through its own window, so this helper finds the app
// windows underneath it (skipping the island) and renders just that part with
// PrintWindow. The island stays visible in screenshots and recordings.
//
// stdin, one request per line:
//   capture <islandHwnd> <x> <y> <width> <height> <outputWidth>
//   (physical screen pixels)
// stdout, one JSON line per request:
//   {"type":"frame","layers":[{"x":..,"y":..,"w":..,"h":..,"app":"chrome","data":"<base64 jpeg>"}]}
//   {"type":"desktop"}   nothing but the desktop behind the island
//   {"type":"error","message":"..."}
// and, unprompted, {"type":"changed"} as soon as a different window (or a
// moved one) is behind the island, so the glass can refresh right away.

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

public static class GlassCapture
{
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT
    {
        public int Left, Top, Right, Bottom;
    }

    [DllImport("user32.dll")] static extern IntPtr GetTopWindow(IntPtr hWnd);
    [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr hWnd, uint cmd);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtrW")] static extern IntPtr GetWindowLongPtr(IntPtr hWnd, int index);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr hWnd, StringBuilder name, int max);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
    [DllImport("user32.dll")] static extern bool PrintWindow(IntPtr hWnd, IntPtr hdc, uint flags);
    [DllImport("user32.dll")] static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr hWnd, int attribute, out int value, int size);
    [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr hWnd, int attribute, out RECT value, int size);

    const uint GW_HWNDNEXT = 2;
    const int GWL_EXSTYLE = -20;
    const long WS_EX_TRANSPARENT = 0x20;
    const int DWMWA_EXTENDED_FRAME_BOUNDS = 9;
    const int DWMWA_CLOAKED = 14;
    const uint PW_RENDERFULLCONTENT = 2;
    const int MAX_LAYERS = 3;

    static readonly Dictionary<IntPtr, Bitmap> buffers = new Dictionary<IntPtr, Bitmap>();
    static readonly object writeLock = new object();
    static ImageCodecInfo jpeg;
    static volatile string watchRequest; // the last capture request, re-checked by the watcher

    class Layer
    {
        public IntPtr Hwnd;
        public RECT Visible;
    }

    static void Write(string json)
    {
        lock (writeLock)
        {
            Console.Out.WriteLine(json);
            Console.Out.Flush();
        }
    }

    public static void Run()
    {
        try { SetThreadDpiAwarenessContext(new IntPtr(-4)); } catch (Exception) { }
        foreach (ImageCodecInfo codec in ImageCodecInfo.GetImageEncoders())
        {
            if (codec.MimeType == "image/jpeg") jpeg = codec;
        }

        Console.OutputEncoding = new UTF8Encoding(false);
        Thread watcher = new Thread(Watch);
        watcher.IsBackground = true; // ends with the process when the app closes stdin
        watcher.Start();
        string line;
        while ((line = Console.In.ReadLine()) != null)
        {
            string reply;
            try
            {
                reply = Handle(line.Trim());
            }
            catch (Exception ex)
            {
                reply = "{\"type\":\"error\",\"message\":\"" + Escape(ex.Message) + "\"}";
            }
            if (reply != null) Write(reply);
        }
    }

    static string Handle(string line)
    {
        string[] parts = line.Split(' ');
        if (parts.Length != 7 || parts[0] != "capture") return null;
        IntPtr own = new IntPtr(long.Parse(parts[1], CultureInfo.InvariantCulture));
        int x = int.Parse(parts[2], CultureInfo.InvariantCulture);
        int y = int.Parse(parts[3], CultureInfo.InvariantCulture);
        int w = int.Parse(parts[4], CultureInfo.InvariantCulture);
        int h = int.Parse(parts[5], CultureInfo.InvariantCulture);
        int outW = int.Parse(parts[6], CultureInfo.InvariantCulture);
        if (w <= 0 || h <= 0 || outW <= 0) return null;
        try { SetThreadDpiAwarenessContext(new IntPtr(-4)); } catch (Exception) { }

        watchRequest = line;
        List<string> layers = new List<string>();
        Dictionary<IntPtr, bool> used = new Dictionary<IntPtr, bool>(); // HashSet lives in System.Core
        foreach (Layer layer in FindLayers(own, x, y, w, h))
        {
            used[layer.Hwnd] = true;
            string captured = CaptureLayer(layer.Hwnd, layer.Visible, x, y, w, h, outW);
            if (captured != null) layers.Add(captured);
        }
        ForgetBuffers(used);

        if (layers.Count == 0) return "{\"type\":\"desktop\"}";
        return "{\"type\":\"frame\",\"layers\":[" + string.Join(",", layers.ToArray()) + "]}";
    }

    // The windows behind the region, topmost first, until one covers it fully.
    static List<Layer> FindLayers(IntPtr own, int x, int y, int w, int h)
    {
        List<Layer> found = new List<Layer>();
        for (IntPtr hwnd = GetTopWindow(IntPtr.Zero); hwnd != IntPtr.Zero; hwnd = GetWindow(hwnd, GW_HWNDNEXT))
        {
            if (hwnd == own || !IsWindowVisible(hwnd) || IsIconic(hwnd)) continue;

            int cloaked;
            if (DwmGetWindowAttribute(hwnd, DWMWA_CLOAKED, out cloaked, 4) == 0 && cloaked != 0) continue;
            long exStyle = GetWindowLongPtr(hwnd, GWL_EXSTYLE).ToInt64();
            if ((exStyle & WS_EX_TRANSPARENT) != 0) continue; // click-through overlays

            StringBuilder cls = new StringBuilder(64);
            GetClassName(hwnd, cls, 64);
            string className = cls.ToString();
            if (className == "Progman" || className == "WorkerW") break; // reached the desktop
            if (className == "Shell_TrayWnd" || className == "Shell_SecondaryTrayWnd") continue;

            RECT visible;
            if (DwmGetWindowAttribute(hwnd, DWMWA_EXTENDED_FRAME_BOUNDS, out visible, Marshal.SizeOf(typeof(RECT))) != 0)
            {
                GetWindowRect(hwnd, out visible);
            }
            if (visible.Right - visible.Left < 40 || visible.Bottom - visible.Top < 24) continue;
            if (visible.Left >= x + w || visible.Right <= x || visible.Top >= y + h || visible.Bottom <= y) continue;

            Layer layer = new Layer();
            layer.Hwnd = hwnd;
            layer.Visible = visible;
            found.Add(layer);

            bool coversAll = visible.Left <= x && visible.Top <= y && visible.Right >= x + w && visible.Bottom >= y + h;
            if (coversAll || found.Count >= MAX_LAYERS) break;
        }
        return found;
    }

    // Every 100 ms, a cheap check of which windows are behind the island
    // (no capturing). Switching apps, opening, moving or closing a window
    // triggers an immediate refresh instead of waiting for the next one.
    static void Watch()
    {
        try { SetThreadDpiAwarenessContext(new IntPtr(-4)); } catch (Exception) { }
        string last = null;
        while (true)
        {
            Thread.Sleep(100);
            string request = watchRequest;
            if (request == null) continue;
            try
            {
                string[] p = request.Split(' ');
                IntPtr own = new IntPtr(long.Parse(p[1], CultureInfo.InvariantCulture));
                int x = int.Parse(p[2], CultureInfo.InvariantCulture);
                int y = int.Parse(p[3], CultureInfo.InvariantCulture);
                int w = int.Parse(p[4], CultureInfo.InvariantCulture);
                int h = int.Parse(p[5], CultureInfo.InvariantCulture);
                StringBuilder signature = new StringBuilder();
                signature.Append(GetForegroundWindow().ToInt64()).Append('|');
                foreach (Layer layer in FindLayers(own, x, y, w, h))
                {
                    signature.Append(layer.Hwnd.ToInt64()).Append(':')
                        .Append(layer.Visible.Left).Append(',').Append(layer.Visible.Top).Append(',')
                        .Append(layer.Visible.Right).Append(',').Append(layer.Visible.Bottom).Append(';');
                }
                string current = signature.ToString();
                if (last != null && current != last) Write("{\"type\":\"changed\"}");
                last = current;
            }
            catch (Exception)
            {
                last = null;
            }
        }
    }

    static string CaptureLayer(IntPtr hwnd, RECT visible, int x, int y, int w, int h, int outW)
    {
        RECT bounds;
        if (!GetWindowRect(hwnd, out bounds)) return null;
        int ww = bounds.Right - bounds.Left;
        int wh = bounds.Bottom - bounds.Top;
        if (ww <= 0 || wh <= 0 || ww > 16384 || wh > 16384) return null;

        Bitmap buffer;
        if (!buffers.TryGetValue(hwnd, out buffer) || buffer.Width != ww || buffer.Height != wh)
        {
            if (buffer != null) buffer.Dispose();
            buffer = new Bitmap(ww, wh, PixelFormat.Format32bppRgb);
            buffers[hwnd] = buffer;
        }

        using (Graphics g = Graphics.FromImage(buffer))
        {
            IntPtr hdc = g.GetHdc();
            bool ok;
            try { ok = PrintWindow(hwnd, hdc, PW_RENDERFULLCONTENT); }
            finally { g.ReleaseHdc(hdc); }
            if (!ok) return null;
        }

        // The part of the window that sits behind the island.
        int ix = Math.Max(visible.Left, x);
        int iy = Math.Max(visible.Top, y);
        int ir = Math.Min(visible.Right, x + w);
        int ib = Math.Min(visible.Bottom, y + h);
        int cw = ir - ix;
        int ch = ib - iy;
        if (cw <= 0 || ch <= 0) return null;

        double scale = (double)outW / w;
        int ow = Math.Max(1, (int)Math.Round(cw * scale));
        int oh = Math.Max(1, (int)Math.Round(ch * scale));

        string data;
        using (Bitmap output = new Bitmap(ow, oh, PixelFormat.Format24bppRgb))
        {
            using (Graphics g = Graphics.FromImage(output))
            {
                g.InterpolationMode = InterpolationMode.Bilinear;
                g.PixelOffsetMode = PixelOffsetMode.Half;
                g.DrawImage(buffer, new Rectangle(0, 0, ow, oh), new Rectangle(ix - bounds.Left, iy - bounds.Top, cw, ch), GraphicsUnit.Pixel);
            }
            using (MemoryStream stream = new MemoryStream())
            {
                if (jpeg != null)
                {
                    EncoderParameters options = new EncoderParameters(1);
                    options.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, 78L);
                    output.Save(stream, jpeg, options);
                }
                else
                {
                    output.Save(stream, ImageFormat.Png);
                }
                data = Convert.ToBase64String(stream.ToArray());
            }
        }

        return "{\"x\":" + (ix - x) + ",\"y\":" + (iy - y) + ",\"w\":" + cw + ",\"h\":" + ch +
               ",\"app\":\"" + Escape(ProcessName(hwnd)) + "\",\"mime\":\"" + (jpeg != null ? "image/jpeg" : "image/png") +
               "\",\"data\":\"" + data + "\"}";
    }

    static void ForgetBuffers(Dictionary<IntPtr, bool> keep)
    {
        List<IntPtr> stale = new List<IntPtr>();
        foreach (IntPtr key in buffers.Keys)
        {
            if (!keep.ContainsKey(key)) stale.Add(key);
        }
        foreach (IntPtr key in stale)
        {
            buffers[key].Dispose();
            buffers.Remove(key);
        }
    }

    static string ProcessName(IntPtr hwnd)
    {
        try
        {
            uint pid;
            GetWindowThreadProcessId(hwnd, out pid);
            using (Process p = Process.GetProcessById((int)pid)) return p.ProcessName;
        }
        catch (Exception)
        {
            return "";
        }
    }

    static string Escape(string s)
    {
        if (s == null) return "";
        StringBuilder sb = new StringBuilder(s.Length);
        foreach (char c in s)
        {
            if (c == '"' || c == '\\') sb.Append('\\').Append(c);
            else if (c < 0x20) sb.Append(' ');
            else sb.Append(c);
        }
        return sb.ToString();
    }
}
