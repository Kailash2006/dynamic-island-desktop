# Dynoland glass helper: compiles GlassCapture.cs (built into Windows
# PowerShell 5.1, no install needed) and serves capture requests over stdin.
$ErrorActionPreference = 'Stop'
try {
  Add-Type -Path (Join-Path $PSScriptRoot 'GlassCapture.cs') -ReferencedAssemblies 'System.Drawing'
} catch {
  $message = ($_.Exception.Message -replace '["\\]', ' ') -replace '\s+', ' '
  [Console]::Out.WriteLine('{"type":"error","message":"' + $message + '"}')
  exit 2
}
[GlassCapture]::Run()
