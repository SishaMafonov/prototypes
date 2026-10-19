$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$references = @([System.Drawing.Bitmap].Assembly.Location, [System.Drawing.Color].Assembly.Location)
Add-Type -Path (Join-Path $PSScriptRoot 'Pixels.cs') -ReferencedAssemblies $references
$projectRoot = Split-Path (Split-Path $PSScriptRoot)
$entries = Get-Content (Join-Path $PSScriptRoot 'templates.json') -Raw | ConvertFrom-Json
foreach ($entry in $entries) {
  $source = [System.Drawing.Bitmap]::new((Join-Path $projectRoot $entry.source))
  $r = $entry.sourceRect
  $rectangle = [System.Drawing.Rectangle]::new($r[0], $r[1], $r[2], $r[3])
  $template = $source.Clone($rectangle, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $template.Save((Join-Path $PSScriptRoot $entry.template), [System.Drawing.Imaging.ImageFormat]::Png)
  $mask = [RequirementPixels]::Mask($template, $entry.bodyCenter[0], $entry.bodyCenter[1], $entry.bodyRadius * 0.7)
  $mask.Save((Join-Path $PSScriptRoot $entry.mask), [System.Drawing.Imaging.ImageFormat]::Png)
  $mask.Dispose()
  $template.Dispose()
  $source.Dispose()
}
Write-Output 'Extracted original sprite frames and opaque-core masks.'
