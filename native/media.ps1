# Dynamic Island media helper (Windows PowerShell 5.1, ships with Windows 10/11).
# Reads what is playing from the Windows media session API (the same source as
# the volume flyout), so it works with Spotify, browsers (YouTube, YouTube Music),
# Apple Music, Media Player and any app that shows up there.
#
# Output: one JSON object per line on stdout.
#   {"type":"media","session":{...}}   or   {"type":"media","session":null}
#   {"type":"thumb","key":"...","data":"data:image/png;base64,..."}
#   {"type":"error","message":"..."}
# Input: one command per line on stdin: toggle | next | prev

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false

function Write-Line($obj) {
  $json = $obj | ConvertTo-Json -Compress -Depth 4
  [Console]::Out.WriteLine($json)
  [Console]::Out.Flush()
}

try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  $null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
  $null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType = WindowsRuntime]
  $null = [Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType = WindowsRuntime]
} catch {
  Write-Line @{ type = 'error'; message = "Media API unavailable: $($_.Exception.Message)" }
  exit 2
}

$asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1

function Await($operation, [Type]$resultType) {
  $task = $asTaskGeneric.MakeGenericMethod($resultType).Invoke($null, @($operation))
  if (-not $task.Wait(4000)) { return $null }
  return $task.Result
}

$managerType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]
$propsType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties]
$manager = Await ($managerType::RequestAsync()) $managerType
if ($null -eq $manager) {
  Write-Line @{ type = 'error'; message = 'Could not open the media session manager' }
  exit 3
}

function Get-Thumbnail($props) {
  if ($null -eq $props.Thumbnail) { return $null }
  $stream = Await ($props.Thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
  if ($null -eq $stream) { return $null }
  try {
    $netStream = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($stream)
    $memory = New-Object System.IO.MemoryStream
    $netStream.CopyTo($memory)
    $bytes = $memory.ToArray()
    $netStream.Dispose()
    $memory.Dispose()
    if ($bytes.Length -eq 0 -or $bytes.Length -gt 900000) { return $null }
    $type = $stream.ContentType
    if ([string]::IsNullOrEmpty($type)) { $type = 'image/jpeg' }
    return "data:$type;base64," + [Convert]::ToBase64String($bytes)
  } finally {
    $stream.Dispose()
  }
}

function Invoke-MediaCommand([string]$command) {
  $session = $manager.GetCurrentSession()
  if ($null -eq $session) { return }
  switch ($command.Trim()) {
    'toggle' { $null = Await ($session.TryTogglePlayPauseAsync()) ([bool]) }
    'next' { $null = Await ($session.TrySkipNextAsync()) ([bool]) }
    'prev' { $null = Await ($session.TrySkipPreviousAsync()) ([bool]) }
  }
}

# Console.In is synchronous in .NET Framework, so read stdin through a StreamReader.
$stdin = New-Object System.IO.StreamReader([Console]::OpenStandardInput())
$pendingLine = $stdin.ReadLineAsync()
$lastJson = ''
$lastThumbKey = ''
$errors = 0

while ($true) {
  while ($pendingLine.IsCompleted) {
    $line = $pendingLine.Result
    if ($null -eq $line) { exit 0 } # the app closed our stdin
    try { Invoke-MediaCommand $line } catch { }
    $pendingLine = $stdin.ReadLineAsync()
  }

  try {
    $session = $manager.GetCurrentSession()
    $state = $null
    if ($null -ne $session) {
      $props = Await ($session.TryGetMediaPropertiesAsync()) $propsType
      $playback = $session.GetPlaybackInfo()
      $timeline = $session.GetTimelineProperties()
      if ($null -ne $props -and -not [string]::IsNullOrEmpty($props.Title)) {
        $duration = ($timeline.EndTime - $timeline.StartTime).TotalSeconds
        $state = [ordered]@{
          app       = $session.SourceAppUserModelId
          title     = $props.Title
          artist    = $props.Artist
          album     = $props.AlbumTitle
          status    = [string]$playback.PlaybackStatus
          position  = [math]::Round(($timeline.Position - $timeline.StartTime).TotalSeconds, 1)
          duration  = [math]::Round($duration, 1)
          updatedAt = $timeline.LastUpdatedTime.ToUnixTimeMilliseconds()
          canSkip   = [bool]$playback.Controls.IsNextEnabled
        }
        $thumbKey = "$($session.SourceAppUserModelId)|$($props.Title)|$($props.Artist)"
        if ($thumbKey -ne $lastThumbKey) {
          $lastThumbKey = $thumbKey
          $thumb = $null
          try { $thumb = Get-Thumbnail $props } catch { }
          Write-Line @{ type = 'thumb'; key = $thumbKey; data = $thumb }
        }
        $state['key'] = $thumbKey
      }
    }
    $json = (@{ type = 'media'; session = $state } | ConvertTo-Json -Compress -Depth 4)
    if ($json -ne $lastJson) {
      [Console]::Out.WriteLine($json)
      [Console]::Out.Flush()
      $lastJson = $json
    }
    $errors = 0
  } catch {
    $errors++
    if ($errors -eq 1 -or $errors % 30 -eq 0) { Write-Line @{ type = 'error'; message = $_.Exception.Message } }
  }

  Start-Sleep -Milliseconds 700
}
