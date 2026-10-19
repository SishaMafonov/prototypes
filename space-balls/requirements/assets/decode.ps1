$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$references = @([System.Drawing.Bitmap].Assembly.Location, [System.Drawing.Color].Assembly.Location)
Add-Type -Path (Join-Path $PSScriptRoot 'Pixels.cs') -ReferencedAssemblies $references
$entries = Get-Content (Join-Path $PSScriptRoot 'templates.json') -Raw | ConvertFrom-Json
$result = foreach ($entry in $entries) {
  $template = [System.Drawing.Bitmap]::new((Join-Path $PSScriptRoot $entry.template))
  $mask = [System.Drawing.Bitmap]::new((Join-Path $PSScriptRoot $entry.mask))
  [pscustomobject]@{
    id = $entry.id; width = $template.Width; height = $template.Height
    rgba = [RequirementPixels]::Rgba($template); mask = [RequirementPixels]::Rgba($mask)
  }
  $template.Dispose()
  $mask.Dispose()
}
ConvertTo-Json -InputObject @($result) -Compress -Depth 4
