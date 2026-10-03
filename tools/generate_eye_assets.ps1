$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$OutDir = Join-Path $Root "Server/lib/Web/public/img/kkutu/moremi/eye"
$RemoveIds = @(
	"moon_glow",
	"nova_glint",
	"ember_lash",
	"aurora_gaze",
	"comet_arc",
	"crystal_tide",
	"velvet_lid",
	"royal_glint",
	"prism_flash",
	"sunset_lash",
	"frost_shine",
	"orbit_gaze",
	"wink_eye",
	"sparkle_eyes",
	"star_eyes",
	"heart_eyes",
	"sleepy_dream",
	"sharp_glance"
)

function Color-Hex($hex) {
	return [System.Drawing.ColorTranslator]::FromHtml($hex)
}

function Color-Alpha($hex, $alpha) {
	return [System.Drawing.Color]::FromArgb([int]$alpha, (Color-Hex $hex))
}

function New-Pen($colorValue, $width) {
	if($colorValue -is [string]){
		$colorValue = Color-Hex $colorValue
	}
	$pen = New-Object System.Drawing.Pen $colorValue, ([single]$width)
	$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
	$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
	$pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
	return $pen
}

function New-Brush($colorValue) {
	if($colorValue -is [string]){
		$colorValue = Color-Hex $colorValue
	}
	return New-Object System.Drawing.SolidBrush $colorValue
}

function New-GradientBrush($x, $y, $w, $h, $hex1, $hex2, $modeName) {
	$rect = New-Object System.Drawing.Rectangle ([int][Math]::Floor($x)), ([int][Math]::Floor($y)), ([int][Math]::Ceiling($w)), ([int][Math]::Ceiling($h))
	$mode = [System.Drawing.Drawing2D.LinearGradientMode]::$modeName
	return New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, (Color-Hex $hex1), (Color-Hex $hex2), $mode
}

function New-Point($x, $y) {
	return New-Object System.Drawing.PointF ([single]$x), ([single]$y)
}

function Draw-OpenEyeBase($g, $cx, $cy, $rx, $ry) {
	$shadow = New-Brush (Color-Alpha "#000000" 18)
	$fill = New-GradientBrush ($cx - $rx - 1) ($cy - $ry) ($rx * 2 + 2) ($ry * 2 + 2) "#ffffff" "#eef5ff" "Vertical"
	$outline = New-Pen "#161616" 2.7
	$stem = New-Pen "#161616" 2.7
	$shine = New-Brush (Color-Alpha "#ffffff" 220)

	$g.FillEllipse($shadow, $cx - $rx - 0.4, $cy - $ry + 0.8, $rx * 2 + 0.8, $ry * 2 + 1.1)
	$g.FillEllipse($fill, $cx - $rx, $cy - $ry, $rx * 2, $ry * 2)
	$g.DrawEllipse($outline, $cx - $rx, $cy - $ry, $rx * 2, $ry * 2)
	$g.DrawLine($stem, $cx, $cy - $ry - 7.2, $cx, $cy - $ry + 1.0)
	$g.FillEllipse($shine, $cx - 1.2, $cy - $ry + 0.9, 2.1, 2.1)

	$shadow.Dispose()
	$fill.Dispose()
	$outline.Dispose()
	$stem.Dispose()
	$shine.Dispose()
}

function Draw-LayerArc($g, $cx, $cy, $w, $h, $start, $sweep, $shadowHex, $mainHex, $highlightHex, $width) {
	$shadow = New-Pen (Color-Alpha $shadowHex 110) ($width + 1.5)
	$main = New-Pen $mainHex $width
	$highlight = New-Pen (Color-Alpha $highlightHex 235) ([Math]::Max(1.1, $width * 0.42))

	$g.DrawArc($shadow, $cx - ($w / 2), $cy - ($h / 2), $w, $h, $start, $sweep)
	$g.DrawArc($main, $cx - ($w / 2), $cy - ($h / 2), $w, $h, $start, $sweep)
	$g.DrawArc($highlight, $cx - ($w / 2), $cy - ($h / 2) - 0.9, $w, $h, $start + 4, $sweep - 8)

	$shadow.Dispose()
	$main.Dispose()
	$highlight.Dispose()
}

function Draw-LayerLine($g, $x1, $y1, $x2, $y2, $shadowHex, $mainHex, $highlightHex, $width) {
	$shadow = New-Pen (Color-Alpha $shadowHex 95) ($width + 1.2)
	$main = New-Pen $mainHex $width
	$highlight = New-Pen (Color-Alpha $highlightHex 240) ([Math]::Max(1.0, $width * 0.4))

	$g.DrawLine($shadow, $x1, $y1, $x2, $y2)
	$g.DrawLine($main, $x1, $y1, $x2, $y2)
	$g.DrawLine($highlight, $x1 + 0.3, $y1 - 0.5, $x2 + 0.3, $y2 - 0.5)

	$shadow.Dispose()
	$main.Dispose()
	$highlight.Dispose()
}

function Draw-DiamondAccent($g, $cx, $cy, $rx, $ry, $fillHex, $lineHex, $glowHex) {
	$glow = New-Brush (Color-Alpha $glowHex 80)
	$fill = New-Brush $fillHex
	$line = New-Pen $lineHex 1.6
	$pts = [System.Drawing.PointF[]]@(
		(New-Point $cx ($cy - $ry)),
		(New-Point ($cx + $rx) $cy),
		(New-Point $cx ($cy + $ry)),
		(New-Point ($cx - $rx) $cy)
	)

	$g.FillEllipse($glow, $cx - $rx - 2.4, $cy - $ry - 2.4, ($rx * 2) + 4.8, ($ry * 2) + 4.8)
	$g.FillPolygon($fill, $pts)
	$g.DrawPolygon($line, $pts)

	$glow.Dispose()
	$fill.Dispose()
	$line.Dispose()
}

function Draw-OrbitDot($g, $cx, $cy, $r, $fillHex, $outlineHex) {
	$fill = New-Brush $fillHex
	$line = New-Pen $outlineHex 1.3
	$g.FillEllipse($fill, $cx - $r, $cy - $r, $r * 2, $r * 2)
	$g.DrawEllipse($line, $cx - $r, $cy - $r, $r * 2, $r * 2)
	$fill.Dispose()
	$line.Dispose()
}

function Draw-PrismShard($g, $points, $hex1, $hex2, $outlineHex) {
	$minX = ($points | ForEach-Object { $_.X } | Measure-Object -Minimum).Minimum
	$maxX = ($points | ForEach-Object { $_.X } | Measure-Object -Maximum).Maximum
	$minY = ($points | ForEach-Object { $_.Y } | Measure-Object -Minimum).Minimum
	$maxY = ($points | ForEach-Object { $_.Y } | Measure-Object -Maximum).Maximum
	$brush = New-GradientBrush $minX $minY ($maxX - $minX + 1) ($maxY - $minY + 1) $hex1 $hex2 "ForwardDiagonal"
	$line = New-Pen $outlineHex 1.4
	$shine = New-Pen (Color-Alpha "#ffffff" 220) 1.1

	$g.FillPolygon($brush, $points)
	$g.DrawPolygon($line, $points)
	$g.DrawLine($shine, $points[0].X + 1.5, $points[0].Y + 2.0, $points[1].X - 1.2, $points[1].Y - 0.2)

	$brush.Dispose()
	$line.Dispose()
	$shine.Dispose()
}

function Draw-HalfLidOverlay($g, $cx, $cy, $rx, $ry, $fill1, $fill2, $edgeHex, $highlightHex) {
	$fill = New-GradientBrush ($cx - $rx - 1.2) ($cy - $ry - 3.0) ($rx * 2 + 2.4) ($ry + 8.5) $fill1 $fill2 "Vertical"
	$shadow = New-Brush (Color-Alpha "#000000" 16)
	$g.FillPie($shadow, $cx - $rx - 1.0, $cy - $ry - 1.0, $rx * 2 + 2.0, $ry * 2 + 2.2, 182, 176)
	$g.FillPie($fill, $cx - $rx - 0.7, $cy - $ry - 2.7, $rx * 2 + 1.4, $ry * 2 + 4.8, 182, 176)
	$shadow.Dispose()
	$fill.Dispose()

	Draw-LayerArc $g $cx ($cy + 0.8) ($rx * 2 + 1.0) ($ry * 1.3 + 2.8) 196 148 $edgeHex $edgeHex $highlightHex 2.4
}

function Save-Eye($name, [scriptblock]$draw) {
	$path = Join-Path $OutDir ($name + ".png")
	$bmp = New-Object System.Drawing.Bitmap 120, 120
	$g = [System.Drawing.Graphics]::FromImage($bmp)
	$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
	$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
	$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
	$g.Clear([System.Drawing.Color]::Transparent)
	& $draw $g
	$bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
	$g.Dispose()
	$bmp.Dispose()
	Write-Output $path
}

foreach($id in $RemoveIds){
	$path = Join-Path $OutDir ($id + ".png")
	if(Test-Path $path){
		Remove-Item -LiteralPath $path -Force
	}
}
