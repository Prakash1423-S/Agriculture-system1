<#
.SYNOPSIS
    AgriMitra Native PowerShell REST API & Static Web Server
    Runs without any third-party dependencies using standard .NET TcpListener.
#>

[CmdletBinding()]
param(
    [int]$Port = 8080,
    [string]$HostAddress = "127.0.0.1"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BaseDir = Split-Path -Parent $ScriptDir
$FrontendDir = Join-Path $BaseDir "frontend"
$DataDir = Join-Path $ScriptDir "data"

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  AgriMitra: Digital Agriculture Intelligence Platform" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Loading data repositories..." -ForegroundColor Yellow

$StatesJson   = Get-Content (Join-Path $DataDir "states.json") -Raw -Encoding UTF8
$CropsJson    = Get-Content (Join-Path $DataDir "crops.json") -Raw -Encoding UTF8
$ProblemsJson = Get-Content (Join-Path $DataDir "problems.json") -Raw -Encoding UTF8
$SchemesJson  = Get-Content (Join-Path $DataDir "schemes.json") -Raw -Encoding UTF8
$QAKnowledge  = Get-Content (Join-Path $DataDir "qa_knowledge.json") -Raw -Encoding UTF8
$CaseStudyJson= Get-Content (Join-Path $DataDir "case_study.json") -Raw -Encoding UTF8

$StatesData   = $StatesJson | ConvertFrom-Json
$CropsData    = $CropsJson | ConvertFrom-Json
$ProblemsData = $ProblemsJson | ConvertFrom-Json
$SchemesData  = $SchemesJson | ConvertFrom-Json
$QAData       = $QAKnowledge | ConvertFrom-Json

Write-Host "  Loaded $($StatesData.Count) States & UTs" -ForegroundColor Green
Write-Host "  Loaded $($CropsData.Count) Crop Profiles" -ForegroundColor Green
Write-Host "  Loaded $($ProblemsData.Count) Disease & Pest Diagnostic Models" -ForegroundColor Green
Write-Host "  Loaded $($SchemesData.Count) Government Welfare Schemes" -ForegroundColor Green

function Get-MimeType($path) {
    $ext = [System.IO.Path]::GetExtension($path).ToLower()
    switch ($ext) {
        ".html" { return "text/html; charset=utf-8" }
        ".htm"  { return "text/html; charset=utf-8" }
        ".css"  { return "text/css; charset=utf-8" }
        ".js"   { return "application/javascript; charset=utf-8" }
        ".json" { return "application/json; charset=utf-8" }
        ".svg"  { return "image/svg+xml" }
        ".png"  { return "image/png" }
        ".jpg"  { return "image/jpeg" }
        ".jpeg" { return "image/jpeg" }
        ".ico"  { return "image/x-icon" }
        default { return "application/octet-stream" }
    }
}

function Answer-AgriQuestion($question, $stateId, $cropId) {
    $qLower = $question.ToLower()
    $matchingPoints = @()
    $matchedTitle = "Agricultural Advisory"
    $matchedSummary = ""

    # Check intents
    foreach ($item in $QAData.faq_intents) {
        foreach ($kw in $item.keywords) {
            if ($qLower.Contains($kw.ToLower())) {
                $matchedTitle = $item.title
                $matchedSummary = $item.summary
                $matchingPoints += $item.points
                break
            }
        }
    }

    # Contextual Crop Additions
    $cropObj = $null
    if ($cropId) {
        $cropObj = $CropsData | Where-Object { $_.id -eq $cropId }
    } else {
        foreach ($c in $CropsData) {
            if ($qLower.Contains($c.name.ToLower().Split(' ')[0])) {
                $cropObj = $c
                break
            }
        }
    }

    # Contextual State Additions
    $stateObj = $null
    if ($stateId) {
        $stateObj = $StatesData | Where-Object { $_.id -eq $stateId }
    } else {
        foreach ($s in $StatesData) {
            if ($qLower.Contains($s.name.ToLower())) {
                $stateObj = $s
                break
            }
        }
    }

    # Build comprehensive response
    $responseObj = [PSCustomObject]@{
        title = $matchedTitle
        summary = if ($matchedSummary) { $matchedSummary } else { "Agronomic expert recommendation based on ICAR, State Agriculture Universities, and KVK guidelines." }
        advice_points = if ($matchingPoints.Count -gt 0) { $matchingPoints | Select-Object -Unique } else {
            @(
                "Maintain optimal plant spacing and avoid stagnant water in field to prevent root rotting pathogens.",
                "Conduct regular morning field scouting to detect early signs of sucking pests or fungal leaf spots.",
                "Ensure balanced N-P-K nutrition and apply Zinc Sulphate 21% @ 10 kg/acre to prevent micronutrient chlorosis.",
                "For localized pest outbreaks, spray Neem Oil 10,000 ppm @ 3 ml/L or consult local KVK scientists.",
                "In case of emergency crop loss, contact Kisan Call Centre (Toll-free: 1800-180-1551) or register claim on PMFBY within 72 hours."
            )
        }
        crop_context = if ($cropObj) {
            [PSCustomObject]@{
                name = $cropObj.name
                season = $cropObj.season
                fertilizer = $cropObj.fertilizer_npk_kg_per_acre
                irrigation = $cropObj.irrigation_stages
                top_pests = $cropObj.top_pests_diseases
            }
        } else { $null }
        state_context = if ($stateObj) {
            [PSCustomObject]@{
                name = $stateObj.name
                zone = $stateObj.agro_climatic_zone
                rainfall = "$($stateObj.annual_rainfall_mm) mm"
                advisory = $stateObj.key_advisory
            }
        } else { $null }
        helpline = "National Kisan Call Centre: 1800-180-1551 (Toll Free, 6 AM - 10 PM in 22 languages)"
    }

    return ($responseObj | ConvertTo-Json -Depth 5)
}

function Diagnose-Problem($cropId, $part, $symptomKeyword) {
    $results = @()
    $kwLower = if ($symptomKeyword) { $symptomKeyword.ToLower() } else { "" }

    foreach ($prob in $ProblemsData) {
        $match = $false

        # Check crop match
        if ($cropId) {
            foreach ($ac in $prob.affected_crops) {
                if ($ac.ToLower().Contains($cropId.ToLower()) -or $prob.affected_crops -contains "All crops") {
                    $match = $true
                    break
                }
            }
        } else {
            $match = $true
        }

        # Check part match
        if ($part -and $part -ne "all") {
            if (-not $prob.plant_part.ToLower().Contains($part.ToLower())) {
                $match = $false
            }
        }

        # Check keyword match
        if ($kwLower -and $kwLower.Trim().Length -gt 0) {
            $searchString = "$($prob.name) $($prob.visual_symptoms) $($prob.immediate_chemical_treatment) $($prob.organic_biological_remedy)".ToLower()
            if (-not $searchString.Contains($kwLower)) {
                $match = $false
            }
        }

        if ($match) {
            $results += $prob
        }
    }

    if ($results.Count -eq 0) {
        # Fallback to top 3 generic problems
        $results = $ProblemsData | Select-Object -First 3
    }

    return ($results | ConvertTo-Json -Depth 5)
}

function Calculate-Fertilizer($cropId, [double]$acres) {
    $crop = $CropsData | Where-Object { $_.id -eq $cropId }
    if (-not $crop) { $crop = $CropsData[0] }

    # Base rates per acre
    $urea = 80 * $acres
    $dap = 50 * $acres
    $mop = 30 * $acres
    $zinc = 10 * $acres
    $seed = 10 * $acres

    if ($crop.id -eq "rice") { $urea = 90 * $acres; $dap = 40 * $acres; $mop = 25 * $acres; $seed = 15 * $acres }
    elseif ($crop.id -eq "wheat") { $urea = 110 * $acres; $dap = 55 * $acres; $mop = 20 * $acres; $seed = 40 * $acres }
    elseif ($crop.id -eq "sugarcane") { $urea = 175 * $acres; $dap = 75 * $acres; $mop = 60 * $acres; $seed = 3000 * $acres }
    elseif ($crop.id -eq "cotton") { $urea = 80 * $acres; $dap = 45 * $acres; $mop = 35 * $acres; $seed = 1.8 * $acres }
    elseif ($crop.id -eq "potato") { $urea = 80 * $acres; $dap = 75 * $acres; $mop = 50 * $acres; $seed = 1000 * $acres }
    elseif ($crop.id -eq "chickpea") { $urea = 15 * $acres; $dap = 40 * $acres; $mop = 15 * $acres; $seed = 35 * $acres }
    elseif ($crop.id -eq "mustard") { $urea = 50 * $acres; $dap = 40 * $acres; $mop = 15 * $acres; $seed = 2 * $acres }

    $calc = [PSCustomObject]@{
        crop = $crop.name
        acres = $acres
        urea_kg = [Math]::Round($urea, 1)
        dap_kg = [Math]::Round($dap, 1)
        mop_kg = [Math]::Round($mop, 1)
        zinc_kg = [Math]::Round($zinc, 1)
        seed_rate_approx = "$([Math]::Round($seed, 1)) kg"
        schedule = "Apply all DAP, MOP, Zinc and 1/3rd Urea at basal sowing; remaining 2/3rd Urea in two equal splits during active vegetative and tillering stages."
    }

    return ($calc | ConvertTo-Json -Depth 3)
}

$ipAddress = [System.Net.IPAddress]::Parse($HostAddress)
$listener = New-Object System.Net.Sockets.TcpListener($ipAddress, $Port)
$listener.Start()

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  AgriMitra Server is running at http://${HostAddress}:${Port}/" -ForegroundColor Green
Write-Host "  Press Ctrl+C to stop the server." -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Green

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
        $writer = New-Object System.IO.StreamWriter($stream, [System.Text.Encoding]::UTF8)

        $requestLine = $reader.ReadLine()
        if (-not $requestLine) {
            $client.Close()
            continue
        }

        $parts = $requestLine.Split(' ')
        $method = $parts[0]
        $url = $parts[1]

        # Read headers
        $headers = @{}
        $contentLength = 0
        while ($true) {
            $line = $reader.ReadLine()
            if ([string]::IsNullOrEmpty($line)) { break }
            $hParts = $line.Split(':', 2)
            if ($hParts.Length -eq 2) {
                $headers[$hParts[0].Trim().ToLower()] = $hParts[1].Trim()
            }
        }

        if ($headers.ContainsKey("content-length")) {
            $contentLength = [int]$headers["content-length"]
        }

        # Read body if POST
        $body = ""
        if ($contentLength -gt 0) {
            $charBuffer = New-Object char[] $contentLength
            $readCount = $reader.ReadBlock($charBuffer, 0, $contentLength)
            $body = New-Object string ($charBuffer, 0, $readCount)
        }

        # Routing
        $rawPath = $url.Split('?')[0]
        $queryString = if ($url.Contains('?')) { $url.Split('?')[1] } else { "" }

        $status = "200 OK"
        $contentType = "text/html; charset=utf-8"
        $responseBytes = $null
        $responseString = ""

        # Handle CORS Preflight
        if ($method -eq "OPTIONS") {
            $writer.WriteLine("HTTP/1.1 200 OK")
            $writer.WriteLine("Access-Control-Allow-Origin: *")
            $writer.WriteLine("Access-Control-Allow-Methods: GET, POST, OPTIONS")
            $writer.WriteLine("Access-Control-Allow-Headers: Content-Type")
            $writer.WriteLine("Content-Length: 0")
            $writer.WriteLine()
            $writer.Flush()
            $client.Close()
            continue
        }

        # API Endpoints
        if ($rawPath.StartsWith("/api/")) {
            $contentType = "application/json; charset=utf-8"

            if ($rawPath -eq "/api/health") {
                $responseString = '{"status":"ok","timestamp":"' + (Get-Date -Format o) + '"}'
            }
            elseif ($rawPath -eq "/api/case-study") {
                $responseString = $CaseStudyJson
            }
            elseif ($rawPath -eq "/api/states") {
                $responseString = $StatesJson
            }
            elseif ($rawPath.StartsWith("/api/states/")) {
                $stateId = $rawPath.Substring("/api/states/".Length)
                $found = $StatesData | Where-Object { $_.id -eq $stateId }
                if ($found) { $responseString = ($found | ConvertTo-Json -Depth 5) }
                else { $status = "404 Not Found"; $responseString = '{"error":"State not found"}' }
            }
            elseif ($rawPath -eq "/api/crops") {
                $responseString = $CropsJson
            }
            elseif ($rawPath.StartsWith("/api/crops/")) {
                $cropId = $rawPath.Substring("/api/crops/".Length)
                $found = $CropsData | Where-Object { $_.id -eq $cropId }
                if ($found) { $responseString = ($found | ConvertTo-Json -Depth 5) }
                else { $status = "404 Not Found"; $responseString = '{"error":"Crop not found"}' }
            }
            elseif ($rawPath -eq "/api/problems") {
                $responseString = $ProblemsJson
            }
            elseif ($rawPath -eq "/api/schemes") {
                $responseString = $SchemesJson
            }
            elseif ($rawPath -eq "/api/problems/diagnose" -and $method -eq "POST") {
                $parsedBody = if ($body) { $body | ConvertFrom-Json } else { $null }
                $cId = if ($parsedBody.crop) { $parsedBody.crop } else { "" }
                $pPart = if ($parsedBody.part) { $parsedBody.part } else { "" }
                $sym = if ($parsedBody.symptom) { $parsedBody.symptom } else { "" }
                $responseString = Diagnose-Problem $cId $pPart $sym
            }
            elseif ($rawPath -eq "/api/chat" -and $method -eq "POST") {
                $parsedBody = if ($body) { $body | ConvertFrom-Json } else { $null }
                $q = if ($parsedBody.question) { $parsedBody.question } else { "What fertilizer should I use?" }
                $sId = if ($parsedBody.state) { $parsedBody.state } else { "" }
                $cId = if ($parsedBody.crop) { $parsedBody.crop } else { "" }
                $responseString = Answer-AgriQuestion $q $sId $cId
            }
            elseif ($rawPath -eq "/api/calculator/fertilizer" -and $method -eq "POST") {
                $parsedBody = if ($body) { $body | ConvertFrom-Json } else { $null }
                $cId = if ($parsedBody.crop) { $parsedBody.crop } else { "wheat" }
                $ac = if ($parsedBody.acres) { [double]$parsedBody.acres } else { 1.0 }
                $responseString = Calculate-Fertilizer $cId $ac
            }
            else {
                $status = "404 Not Found"
                $responseString = '{"error":"Endpoint not found"}'
            }
        }
        else {
            # Static files serving
            $filePath = ""
            if ($rawPath -eq "/" -or $rawPath -eq "") {
                $filePath = Join-Path $FrontendDir "index.html"
            } else {
                $relPath = $rawPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
                $filePath = Join-Path $FrontendDir $relPath
            }

            if ([System.IO.File]::Exists($filePath)) {
                $contentType = Get-MimeType $filePath
                $responseBytes = [System.IO.File]::ReadAllBytes($filePath)
            } else {
                $status = "404 Not Found"
                $responseString = "<h1>404 Not Found</h1><p>The requested file $rawPath was not found.</p>"
                $contentType = "text/html; charset=utf-8"
            }
        }

        # Send response
        $writer.WriteLine("HTTP/1.1 $status")
        $writer.WriteLine("Content-Type: $contentType")
        $writer.WriteLine("Access-Control-Allow-Origin: *")
        $writer.WriteLine("Server: AgriMitra-PowerShell/1.0")

        if ($responseBytes -ne $null) {
            $writer.WriteLine("Content-Length: $($responseBytes.Length)")
            $writer.WriteLine()
            $writer.Flush()
            $stream.Write($responseBytes, 0, $responseBytes.Length)
        } else {
            $utf8Bytes = [System.Text.Encoding]::UTF8.GetBytes($responseString)
            $writer.WriteLine("Content-Length: $($utf8Bytes.Length)")
            $writer.WriteLine()
            $writer.Flush()
            $stream.Write($utf8Bytes, 0, $utf8Bytes.Length)
        }

        $stream.Flush()
        $client.Close()
    }
}
finally {
    $listener.Stop()
    Write-Host "`nServer stopped." -ForegroundColor Yellow
}
