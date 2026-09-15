$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$sstPath = Join-Path $root "tmp-apt-xlsx\xl\sharedStrings.xml"
$sheetPath = Join-Path $root "tmp-apt-xlsx\xl\worksheets\sheet1.xml"
$outPath = Join-Path $root "data\stations.js"

function Get-ColIndex([string]$ref) {
  $letters = [regex]::Match($ref, "^[A-Z]+").Value
  $n = 0
  foreach ($ch in $letters.ToCharArray()) { $n = $n * 26 + ([int]$ch - 64) }
  return $n
}

function Get-CellText([string]$xml, [string[]]$sst) {
  if ($xml -match 't="s"') {
    if ($xml -match "<v>(\d+)</v>") { return $sst[[int]$Matches[1]] }
    return ""
  }
  if ($xml -match "<v>([^<]*)</v>") { return $Matches[1] }
  return ""
}

function Get-Trim($map, [int]$idx) {
  if (-not $map.ContainsKey($idx)) { return "" }
  $v = $map[$idx]
  if ($null -eq $v) { return "" }
  return $v.Trim()
}

function ConvertTo-JsonNum($s) {
  if ($null -eq $s -or $s -eq "") { return "null" }
  $n = 0.0
  if ([double]::TryParse($s, [ref]$n)) { return ([int][Math]::Round($n)).ToString() }
  return "null"
}

function ConvertTo-JsonStr([string]$s) {
  if ($null -eq $s) { $s = "" }
  $s = $s.Replace("\", "\\").Replace('"', '\"').Replace("`r", "").Replace("`n", "\n")
  return '"' + $s + '"'
}

Write-Host "Loading shared strings..."
$nsMgr = New-Object System.Xml.XmlNamespaceManager (New-Object System.Xml.NameTable)
$nsMgr.AddNamespace("m", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")
$sstDoc = New-Object System.Xml.XmlDocument
$sstDoc.Load($sstPath)
$sis = $sstDoc.SelectNodes("//m:si", $nsMgr)
$sst = New-Object string[] $sis.Count
for ($i = 0; $i -lt $sis.Count; $i++) {
  $sst[$i] = ($sis[$i].SelectNodes(".//m:t", $nsMgr) | ForEach-Object { $_.InnerText }) -join ""
}
$sstDoc = $null
$sis = $null
[GC]::Collect()
Write-Host ("SST=" + $sst.Length)

$regions = New-Object "System.Collections.Generic.HashSet[string]"
$types = New-Object "System.Collections.Generic.HashSet[string]"
$sb = New-Object System.Text.StringBuilder
[void]$sb.Append("[")
$count = 0

$settings = New-Object System.Xml.XmlReaderSettings
$settings.IgnoreWhitespace = $true
$reader = [System.Xml.XmlReader]::Create($sheetPath, $settings)
Write-Host "Streaming rows..."
$ok = $reader.Read()
while ($ok) {
  if ($reader.NodeType -eq "Element" -and $reader.LocalName -eq "row") {
    $r = [int]$reader.GetAttribute("r")
    $rowXml = $reader.ReadOuterXml()
    if ($r -ge 5) {
      $vals = @{}
      foreach ($m in [regex]::Matches($rowXml, '<c r="([A-Z]+)\d+"[^>]*/>|<c r="([A-Z]+)\d+"[^>]*>(.*?)</c>')) {
        if ($m.Groups[1].Success) { continue }
        $idx = Get-ColIndex $m.Groups[2].Value
        $vals[$idx] = Get-CellText $m.Groups[0].Value $sst
      }
      $name = Get-Trim $vals 2
      if ($name) {
        $opList = New-Object System.Collections.Generic.List[string]
        for ($col = 26; $col -le 50; $col += 4) {
          $op = Get-Trim $vals $col
          if ($op -and -not $opList.Contains($op)) { $opList.Add($op) }
        }
        $ops = [string]::Join(", ", $opList.ToArray())
        $chSum = 0
        $chAny = $false
        for ($col = 29; $col -le 53; $col += 4) {
          if ($vals.ContainsKey($col) -and $vals[$col] -ne "") {
            $nn = 0.0
            if ([double]::TryParse($vals[$col], [ref]$nn)) {
              $chSum += [int][Math]::Round($nn)
              $chAny = $true
            }
          }
        }
        $chCell = ConvertTo-JsonNum $vals[54]
        if ($chCell -eq "null" -and $chAny) { $chCell = "$chSum" }
        $region = Get-Trim $vals 3
        $type = Get-Trim $vals 7
        if ($region) { [void]$regions.Add($region) }
        if ($type) { [void]$types.Add($type) }
        if ($count -gt 0) { [void]$sb.Append(",") }
        [void]$sb.Append("{")
        [void]$sb.Append('"name":' + (ConvertTo-JsonStr $name))
        [void]$sb.Append(',"kind":' + (ConvertTo-JsonStr (Get-Trim $vals 1)))
        [void]$sb.Append(',"type":' + (ConvertTo-JsonStr $type))
        [void]$sb.Append(',"region":' + (ConvertTo-JsonStr $region))
        [void]$sb.Append(',"city":' + (ConvertTo-JsonStr (Get-Trim $vals 4)))
        [void]$sb.Append(',"road":' + (ConvertTo-JsonStr (Get-Trim $vals 5)))
        [void]$sb.Append(',"jibun":' + (ConvertTo-JsonStr (Get-Trim $vals 6)))
        [void]$sb.Append(',"code":' + (ConvertTo-JsonStr (Get-Trim $vals 8)))
        [void]$sb.Append(',"households":' + (ConvertTo-JsonNum $vals[11]))
        [void]$sb.Append(',"capacity":' + (ConvertTo-JsonNum $vals[13]))
        [void]$sb.Append(',"parking":' + (ConvertTo-JsonNum $vals[14]))
        [void]$sb.Append(',"evCars":' + (ConvertTo-JsonNum $vals[21]))
        [void]$sb.Append(',"ground":' + (ConvertTo-JsonStr (Get-Trim $vals 22)))
        [void]$sb.Append(',"under":' + (ConvertTo-JsonStr (Get-Trim $vals 23)))
        [void]$sb.Append(',"spotsG":' + (ConvertTo-JsonNum $vals[24]))
        [void]$sb.Append(',"spotsU":' + (ConvertTo-JsonNum $vals[25]))
        [void]$sb.Append(',"chargers":' + $chCell)
        [void]$sb.Append(',"operators":' + (ConvertTo-JsonStr $ops))
        [void]$sb.Append("}")
        $count++
        if ($count % 4000 -eq 0) { Write-Host ("parsed " + $count) }
      }
    }
    $ok = -not $reader.EOF
    continue
  }
  $ok = $reader.Read()
}
$reader.Close()
[void]$sb.Append("]")
Write-Host ("rows=" + $count)

function ConvertTo-JsonStrArray($items) {
  $parts = New-Object System.Collections.Generic.List[string]
  foreach ($x in ($items | Sort-Object)) { $parts.Add((ConvertTo-JsonStr $x)) }
  return "[" + [string]::Join(",", $parts.ToArray()) + "]"
}

$utf8 = New-Object System.Text.UTF8Encoding $false
$js = "window.CPO_STATION_PACK = {`"source`":`"\uCDA9\uC804\uAE30 \uC544\uD30C\uD2B8 \uC815\uBCF4_v0.1.xlsx`",`"count`":$count,`"regions`":$(ConvertTo-JsonStrArray $regions),`"types`":$(ConvertTo-JsonStrArray $types),`"stations`":$($sb.ToString())};`n" +
      "(function () {`n" +
      "  var P = window.CPO_STATION_PACK;`n" +
      "  var D = window.CPO_DATA = window.CPO_DATA || {};`n" +
      "  D.stationSource = P.source;`n" +
      "  D.regions = P.regions;`n" +
      "  D.complexTypes = P.types;`n" +
      "  D.stations = P.stations;`n" +
      "})();`n"
[IO.File]::WriteAllText($outPath, $js, $utf8)
Write-Host ("wrote " + $outPath + " bytes=" + (Get-Item $outPath).Length)
