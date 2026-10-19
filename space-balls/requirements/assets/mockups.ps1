$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'drawing.ps1')
$profile = (Get-Content (Join-Path $PSScriptRoot 'geometry.json') -Raw | ConvertFrom-Json).landscape
$script:images = @{}
foreach ($entry in (Get-Content (Join-Path $PSScriptRoot 'templates.json') -Raw | ConvertFrom-Json)) {
  $image = [System.Drawing.Bitmap]::new((Join-Path $PSScriptRoot $entry.template))
  $script:images[$entry.id] = $image
  $flipped = [System.Drawing.Bitmap]$image.Clone()
  $flipped.RotateFlip([System.Drawing.RotateFlipType]::RotateNoneFlipX)
  $script:images[$entry.id + '-mirror'] = $flipped
}
$colors = @{ Earth = '#67e8d8'; Jupiter = '#ffc174'; Lava = '#ff8f69'; Ice = '#83d7ff' }
$projectRoot = Split-Path (Split-Path $PSScriptRoot)
$script:images['tail'] = [System.Drawing.Bitmap]::new((Join-Path $projectRoot 'src/assets/ball_tail.png'))
$a = $profile.arena
foreach ($name in @('loading','asset-error','picker','ready','count-ready','count-steady','count-go','playing','goal','result-you','result-opponent')) {
  New-Canvas
  Panel $a.left $a.top $a.width $a.height '#07122a'
  Box (($a.left+$a.right)/2) $a.top 1 $a.height '#263b58'
  if ($name -in @('loading','asset-error','picker')) {
    Label 'SPACE BALLS' 480 54 14 '#82dbff'
    Label 'Pick your planet' 480 81 32
    Art 'planet-earth' 480 245 205 273.33
    Ring 306 245 24 '#a4e9ff'; Label '<' 306 228 27 '#a4e9ff'
    Ring 654 245 24 '#a4e9ff'; Label '>' 654 228 27 '#a4e9ff'
    Label 'Earth' 480 367 23; Label '1 / 4' 480 397 12 '#9aacc6'
    $button = if ($name -eq 'loading') {'Loading game...'} elseif ($name -eq 'asset-error') {'Game assets unavailable'} else {'Confirm'}
    Box 370 432 220 48 '#85e4ff'; Label $button 480 443 16 '#071328'
    if ($name -eq 'asset-error') { Label 'Unable to load the game artwork. Please reload to try again.' 480 488 13 '#ffb8ba' }
  } elseif ($name -eq 'ready') {
    Label 'READY FOR LAUNCH' 480 200 14 '#82dbff'
    Label 'Tap or click to start' 480 230 42
    Label 'First to 10 points. Win by 2.' 480 290 17 '#a9bcd5'; Voice
  } else {
    foreach ($planet in $profile.planets) { Ring $planet.centerX $planet.centerY $planet.gravityRadius $colors[$planet.name] }
    foreach ($planet in $profile.planets) {
      Art ('planet-'+$planet.name.ToLower()) $planet.x $planet.y $planet.diameter ($planet.diameter*724/543) ($planet.side -eq 1)
    }
    Label 'YOUR EARTH' $profile.planets[6].centerX ($profile.planets[6].centerY-$profile.planets[6].gravityRadius-22) 11 '#b8eeff'
    Net $a.goalX[0] $a.top $a.goalSize '#86eaff'
    Net $a.goalX[1] ($a.top+.6*($a.height-$a.goalSize)) $a.goalSize '#ff91e8'
    $bx = $a.left+$a.width*.5; $by = $a.top+$a.height*.5
    if ($name -eq 'playing') {
      $bx = $a.left+$a.width*.52; $by = $a.top+$a.height*.62
    } elseif ($name -eq 'goal') { $bx=$a.goalX[1]; $by=$a.top+.6*($a.height-$a.goalSize)+$a.goalSize/2 }
    Ball $bx $by ($a.ballRadius*2) ($name -eq 'playing')
    Panel 340 33 280 51
    $you = if ($name -eq 'goal') {'1'} elseif ($name -eq 'result-you') {'10'} elseif ($name -eq 'result-opponent') {'8'} else {'0'}
    $opp = if ($name -eq 'result-you') {'8'} elseif ($name -eq 'result-opponent') {'10'} else {'0'}
    Label ('You  '+$you) 397 43 22 '#86eaff'; Label ':' 478 43 22 '#9aaac4'
    Label ($opp+'  Opponent') 554 43 22 '#ff91e8'
    $rule = if ($name -like 'result-*') {'Match complete'} else {'First to 10 - Win by 2'}
    Label $rule 480 90 11 '#b9cde5'
    if ($name -notlike 'result-*') { Voice }
    if ($name -like 'count-*' -or $name -eq 'goal') {
      Panel 285 210 390 110 '#081227'
      $word = switch ($name) { 'count-ready' {'Ready?'} 'count-steady' {'Steady!'} 'count-go' {'GO!'} 'goal' {'You score!'} }
      Label $word 480 222 52
      $hint = if ($name -eq 'goal') {'Next round starting...'} else {'Get ready for launch'}
      Label $hint 480 290 16 '#b5c9e1'
    }
    if ($name -like 'result-*') {
      $shade=[System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(195,2,6,22))
      $script:g.FillRectangle($shade,0,0,960,540); $shade.Dispose()
      Panel 260 65 440 410 '#102038'
      Trophy 480 73; Label 'CONGRATULATIONS!' 480 134 13 '#82dbff'
      $winner=if ($name -eq 'result-you') {'You win!'} else {'Opponent wins!'}
      $color=if ($name -eq 'result-you') {'#86eaff'} else {'#ff91e8'}
      Label $winner 480 169 36 $color
      Label 'You                 Opponent' 480 230 13 '#adc6df'
      $scores=if ($name -eq 'result-you') {'10     :     8'} else {'8     :     10'}
      Label $scores 480 255 56
      Label 'Choose a new planet and play another match.' 480 340 14 '#adc6df'
      Box 396 392 168 48 '#85e4ff'; Label 'New Game' 480 405 16 '#071328'
    }
  }
  Save-Canvas $name
}
New-Canvas 960 250
$i=0
foreach ($id in @('planet-earth','planet-jupiter','planet-lava','planet-ice','asteroid')) {
  $width=if ($id -eq 'asteroid') {100} else {90}; $height=if ($id -eq 'asteroid') {100} else {120}
  Art $id (100+$i*155) 100 $width $height; Label $id (100+$i*155) 180 13; $i++
}
Net 870 45 65 '#86eaff'; Net 910 120 65 '#ff91e8'
Save-Canvas 'component-atlas'
foreach ($image in $script:images.Values) { $image.Dispose() }
Write-Output 'Rendered schematic stages and component atlas.'
