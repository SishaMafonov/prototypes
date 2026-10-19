Add-Type -AssemblyName System.Drawing
function New-Canvas([int]$width = 960, [int]$height = 540) {
  $script:bitmap = [System.Drawing.Bitmap]::new($width, $height)
  $script:g = [System.Drawing.Graphics]::FromImage($script:bitmap)
  $script:g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $script:g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $script:g.Clear([System.Drawing.ColorTranslator]::FromHtml('#030719'))
}
function Box([float]$x, [float]$y, [float]$w, [float]$h, [string]$color) {
  $brush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($color))
  $script:g.FillRectangle($brush, $x, $y, $w, $h); $brush.Dispose()
}
function Label([string]$text, [float]$x, [float]$y, [float]$size = 16, [string]$color = '#f3f7ff', [bool]$center = $true) {
  $font = [System.Drawing.Font]::new('Segoe UI', $size, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $brush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($color))
  if ($center) { $x -= $script:g.MeasureString($text, $font).Width / 2 }
  $script:g.DrawString($text, $font, $brush, $x, $y); $font.Dispose(); $brush.Dispose()
}
function Ring([float]$x, [float]$y, [float]$radius, [string]$color, [float]$width = 2) {
  $pen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml($color), $width)
  $script:g.DrawEllipse($pen, $x - $radius, $y - $radius, $radius * 2, $radius * 2); $pen.Dispose()
}
function Panel([float]$x, [float]$y, [float]$w, [float]$h, [string]$color = '#0c1c32') {
  Box $x $y $w $h $color
  $pen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#6da4be'), 1)
  $script:g.DrawRectangle($pen, $x, $y, $w, $h); $pen.Dispose()
}
function Art([string]$id, [float]$x, [float]$y, [float]$width, [float]$height, [bool]$mirror = $false) {
  $image = $script:images[$id]
  if ($mirror) { $image = $script:images[$id + '-mirror'] }
  $script:g.DrawImage($image, [System.Drawing.RectangleF]::new($x - $width/2, $y - $height/2, $width, $height))
}
function Net([float]$x, [float]$y, [float]$height, [string]$color) {
  $width = $height * .4; Panel ($x - $width/2) $y $width $height '#031023'
  $pen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml($color), 1.5)
  $script:g.DrawRectangle($pen, $x - $width/2, $y, $width, $height)
  for ($i = 1; $i -lt 4; $i++) { $mx = $x-$width/2+$width*$i/4; $script:g.DrawLine($pen, $mx, $y, $mx, $y+$height) }
  for ($i = 1; $i -lt 8; $i++) { $my = $y+$height*$i/8; $script:g.DrawLine($pen, $x-$width/2, $my, $x+$width/2, $my) }
  $pen.Dispose()
}
function Voice {
  Panel 250 455 460 70
  Label 'Boost your Earth on the left when the asteroid enters its field.' 480 462 12
  Panel 264 481 140 24; Label 'Enable microphone' 334 485 12
  Box 420 491 110 5 '#39546c'; Panel 550 481 90 24; Label 'Boost' 595 485 12
  Label 'Mic off - Hold Boost or Space to play without a mic.' 480 509 10 '#adc6df'
}
function Trophy([float]$x, [float]$y) {
  $saved = $script:g.Save(); $script:g.TranslateTransform($x-32, $y)
  $pen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#ffdb8e'), 3)
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddLine(20,10,44,10); $path.AddLine(44,10,44,26)
  $path.AddBezier(44,26,44,42,20,42,20,26); $path.AddLine(20,26,20,10)
  $script:g.DrawPath($pen,$path); $script:g.DrawArc($pen,9,14,18,20,90,180)
  $script:g.DrawArc($pen,37,14,18,20,270,180); $script:g.DrawLine($pen,32,38,32,50)
  $script:g.DrawLine($pen,24,50,40,50); $script:g.DrawLine($pen,20,55,44,55)
  $path.Dispose(); $pen.Dispose(); $script:g.Restore($saved)
}
function Ball([float]$x, [float]$y, [float]$diameter, [bool]$tail) {
  $saved=$script:g.Save()
  $script:g.SetClip([System.Drawing.RectangleF]::new($a.left,$a.top,$a.width,$a.height))
  if ($tail) {
    $transform=$script:g.Save(); $script:g.TranslateTransform($x,$y)
    $image=$script:images['tail']; $width=$diameter*4.5; $height=$width*$image.Height/$image.Width
    $script:g.RotateTransform(-[Math]::Atan2(.42*$image.Height,.87*$image.Width)*180/[Math]::PI)
    $script:g.DrawImage($image,[System.Drawing.RectangleF]::new(-.93*$width,-.71*$height,$width,$height))
    $script:g.Restore($transform)
  }
  Art 'asteroid' $x $y $diameter $diameter; $script:g.Restore($saved)
}
function Save-Canvas([string]$name) {
  Label 'SCHEMATIC - NOT A BASELINE' 12 4 9 '#6f819c' $false
  $script:bitmap.Save((Join-Path $PSScriptRoot ('mockups/' + $name + '.png')), [System.Drawing.Imaging.ImageFormat]::Png)
  $script:g.Dispose(); $script:bitmap.Dispose()
}
