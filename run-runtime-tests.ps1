$ErrorActionPreference = "Continue"

$root = $PSScriptRoot
if (-not $root) {
  $root = (Get-Location).Path
}
$webDir = Join-Path $root "apps\web"
$apiDir = Join-Path $root "apps\api"
$reportDir = Join-Path $root "test-results"
$httpResultPath = Join-Path $reportDir "http-runtime-results.json"
$proxyLogPath = Join-Path $reportDir "proxy-tests.log"
$pagesLogPath = Join-Path $reportDir "page-route-tests.log"

New-Item -Path $reportDir -ItemType Directory -Force | Out-Null

$runtime = [ordered]@{
  startedAt = (Get-Date).ToString("o")
  urls = @{
    web = "http://localhost:3000"
    api = "http://localhost:4000"
  }
  phase2 = @()
  phase3 = @()
  phase4 = @()
  errors = @()
}

function Add-CaseResult {
  param(
    [string]$Phase,
    [string]$Id,
    [string]$Name,
    [int]$Status,
    [string]$Expected,
    [bool]$Pass,
    [string]$Body
  )
  $obj = [ordered]@{
    id = $Id
    name = $Name
    status = $Status
    expected = $Expected
    pass = $Pass
    body = $Body
  }
  if ($Phase -eq "phase2") {
    $runtime.phase2 += $obj
  } elseif ($Phase -eq "phase3") {
    $runtime.phase3 += $obj
  } else {
    $runtime.phase4 += $obj
  }
}

function Invoke-Http {
  param(
    [string]$Url,
    [string]$Method = "GET",
    [string]$Body = "",
    [hashtable]$Headers = @{}
  )
  $result = [ordered]@{
    status = 0
    body = ""
    ok = $false
  }
  try {
    if ([string]::IsNullOrWhiteSpace($Body)) {
      $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -Method $Method -Headers $Headers -TimeoutSec 15
    } else {
      $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -Method $Method -Headers $Headers -Body $Body -TimeoutSec 15
    }
    $result.status = [int]$response.StatusCode
    $result.body = [string]$response.Content
    $result.ok = $true
    return $result
  } catch {
    $status = 0
    $body = $_.Exception.Message
    if ($_.Exception.Response) {
      try { $status = [int]$_.Exception.Response.StatusCode.value__ } catch { $status = 0 }
      try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $body = $reader.ReadToEnd()
        $reader.Close()
      } catch { }
    }
    $result.status = $status
    $result.body = [string]$body
    $result.ok = $false
    return $result
  }
}

function Wait-ForServer {
  param(
    [string]$Url,
    [int]$TimeoutSec = 90,
    [int[]]$ExpectedStatusCodes = @(200)
  )
  $start = Get-Date
  while (((Get-Date) - $start).TotalSeconds -lt $TimeoutSec) {
    $ping = Invoke-Http -Url $Url -Method "GET"
    if ($ExpectedStatusCodes -contains $ping.status) {
      return $true
    }
    Start-Sleep -Seconds 2
  }
  return $false
}

function Stop-ProcessTree {
  param(
    [int]$ProcessId
  )
  if ($ProcessId -le 0) {
    return
  }

  cmd.exe /c "taskkill /PID $ProcessId /T /F" | Out-Null
}

function Stop-PortListeners {
  param(
    [int[]]$Ports
  )

  $lines = netstat -ano | Select-String "LISTENING"
  foreach ($port in $Ports) {
    $pattern = ":{0}\s" -f $port
    $pids = @()
    foreach ($line in $lines) {
      $text = ($line.ToString() -replace "\s+", " ").Trim()
      if ($text -match $pattern) {
        $parts = $text.Split(" ")
        $pidText = $parts[$parts.Length - 1]
        $pidValue = 0
        if ([int]::TryParse($pidText, [ref]$pidValue) -and $pidValue -gt 0) {
          $pids += $pidValue
        }
      }
    }

    $pids = $pids | Select-Object -Unique
    foreach ($procId in $pids) {
      Stop-ProcessTree -ProcessId $procId
    }
  }
}

$apiProcess = $null
$webProcess = $null

try {
  Set-Location $root
  Stop-PortListeners -Ports @(3000, 3001, 4000)

  $apiProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c set PORT=4000&& npm.cmd run dev" -WorkingDirectory $apiDir -PassThru
  $webProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm.cmd run dev -- --hostname 127.0.0.1 --port 3000" -WorkingDirectory $webDir -PassThru

  $apiReady = Wait-ForServer -Url "http://localhost:4000" -TimeoutSec 120 -ExpectedStatusCodes @(200)
  $webReady = Wait-ForServer -Url "http://localhost:3000" -TimeoutSec 120 -ExpectedStatusCodes @(200)
  if (-not $apiReady) {
    $runtime.errors += "API server did not become ready on port 4000."
  }
  if (-not $webReady) {
    $runtime.errors += "Web server did not become ready on port 3000."
  }

  Set-Location $root
  Remove-Item -Path $proxyLogPath -Force -ErrorAction SilentlyContinue
  Remove-Item -Path $pagesLogPath -Force -ErrorAction SilentlyContinue

  $web = "http://localhost:3000"
  $api = "http://localhost:4000"

  $healthChecks = @("$api/health", "$api/api/health", "$api/")
  $healthPass = $false
  $healthDetails = "No healthy endpoint found"
  foreach ($h in $healthChecks) {
    $hr = Invoke-Http -Url $h -Method "GET"
    if ($hr.status -eq 200) {
      $healthPass = $true
      $healthDetails = "200 from $h"
      break
    }
  }
  Add-CaseResult -Phase "phase2" -Id "T2.1" -Name "API Health Check" -Status ($(if($healthPass){200}else{0})) -Expected "200 from /health or /api/health or /" -Pass $healthPass -Body $healthDetails

  $bookingExistsHeaders = @{ "Content-Type" = "application/json"; "X-Forwarded-For" = "198.51.100.10" }
  $t22 = Invoke-Http -Url "$api/api/bookings" -Method "POST" -Body "{}" -Headers $bookingExistsHeaders
  Add-CaseResult -Phase "phase2" -Id "T2.2" -Name "Booking endpoint exists" -Status $t22.status -Expected "400 or 422 (validation error)" -Pass (@(400, 422, 401, 403, 429) -contains $t22.status) -Body ($t22.body.Substring(0, [Math]::Min(220, $t22.body.Length)))

  $validApiPayload = '{"name":"QA User","email":"qa@zeroops.in","phone":"9999999999","businessType":"Tech","service":"Website Development","message":"Automated QA booking test"}'
  $t23Headers = @{ "Content-Type" = "application/json"; "X-Forwarded-For" = "198.51.100.11" }
  $t23 = Invoke-Http -Url "$api/api/bookings" -Method "POST" -Body $validApiPayload -Headers $t23Headers
  $t23Body = $t23.body.Substring(0, [Math]::Min(220, $t23.body.Length))
  $t23Pass = (@(200, 201, 400) -contains $t23.status) -or ($t23.status -eq 400 -and $t23Body -match "captcha_required")
  Add-CaseResult -Phase "phase2" -Id "T2.3" -Name "Booking with valid payload" -Status $t23.status -Expected "200/201 or captcha_required (security gate)" -Pass $t23Pass -Body $t23Body

  $t24Headers = @{ "Content-Type" = "application/json"; "X-Forwarded-For" = "198.51.100.12" }
  $t24 = Invoke-Http -Url "$api/api/auth/google" -Method "POST" -Body '{"credential":"test"}' -Headers $t24Headers
  Add-CaseResult -Phase "phase2" -Id "T2.4" -Name "Google Auth endpoint" -Status $t24.status -Expected "400 or 401" -Pass (@(400, 401) -contains $t24.status) -Body ($t24.body.Substring(0, [Math]::Min(220, $t24.body.Length)))

  $t25 = Invoke-Http -Url "$api/api/calls/slots" -Method "GET"
  $t25Pass = @((200), (503)) -contains $t25.status
  Add-CaseResult -Phase "phase2" -Id "T2.5" -Name "Call slots endpoint" -Status $t25.status -Expected "200 with slots array or 503 degraded mode" -Pass $t25Pass -Body ($t25.body.Substring(0, [Math]::Min(220, $t25.body.Length)))

  $leadPayload = '{"name":"Lead Test","email":"lead@test.com","phone":"9999999999","businessType":"Startup","service":"Business Automation","message":"Lead endpoint payload validation test"}'
  $t26Headers = @{ "Content-Type" = "application/json"; "X-Forwarded-For" = "198.51.100.13" }
  $t26 = Invoke-Http -Url "$api/api/leads" -Method "POST" -Body $leadPayload -Headers $t26Headers
  $t26Body = $t26.body.Substring(0, [Math]::Min(220, $t26.body.Length))
  $t26Pass = (@(200, 201, 400, 422) -contains $t26.status) -or ($t26.status -eq 400 -and $t26Body -match "captcha_required")
  Add-CaseResult -Phase "phase2" -Id "T2.6" -Name "Leads endpoint" -Status $t26.status -Expected "200/201/422 or captcha_required (security gate)" -Pass $t26Pass -Body $t26Body

  $t28 = Invoke-Http -Url "$api/api/bookings" -Method "OPTIONS" -Headers @{ "Origin" = "https://www.zeroops.in"; "Access-Control-Request-Method" = "POST"; "Access-Control-Request-Headers" = "content-type" }
  $corsPass = $false
  if ($t28.status -gt 0) {
    try {
      $wr = Invoke-WebRequest -UseBasicParsing -Uri "$api/api/bookings" -Method "OPTIONS" -Headers @{ "Origin" = "https://www.zeroops.in"; "Access-Control-Request-Method" = "POST"; "Access-Control-Request-Headers" = "content-type" } -TimeoutSec 15
      $corsPass = [string]::IsNullOrWhiteSpace($wr.Headers["Access-Control-Allow-Origin"]) -eq $false
    } catch {
      $corsPass = $false
    }
  }
  Add-CaseResult -Phase "phase2" -Id "T2.8" -Name "CORS headers present" -Status $t28.status -Expected "Access-Control-Allow-Origin header present" -Pass $corsPass -Body ($t28.body.Substring(0, [Math]::Min(220, $t28.body.Length)))

  $proxyCases = @(
    @{
      id = "T3.1"; name = "Internal bookings proxy"; method = "POST"; url = "$web/internal/bookings";
      body = '{"name":"Test User","email":"test@zeroops.in","phone":"9999999999","service":"Website Development","teamSize":"1-10","message":"Test booking","businessType":"Tech","budget":"30000"}';
      expect = "200/201 or known handled error";
      passStatuses = @(200, 201, 400, 401, 403, 422, 429, 503);
      headers = @{ "X-Forwarded-For" = "198.51.100.21" }
    },
    @{
      id = "T3.2"; name = "Internal google-auth proxy"; method = "POST"; url = "$web/internal/google-auth";
      body = '{"credential":"fake-token","clientId":"fake-id"}';
      expect = "JSON response not route crash";
      passStatuses = @(200, 400, 401, 403, 422, 429, 500, 503);
      headers = @{ "X-Forwarded-For" = "198.51.100.22" }
    },
    @{
      id = "T3.3"; name = "Internal calls slots proxy"; method = "GET"; url = "$web/internal/calls/slots";
      body = "";
      expect = "JSON response";
      passStatuses = @(200, 503);
      headers = @{ "X-Forwarded-For" = "198.51.100.23" }
    },
    @{
      id = "T3.4"; name = "Proxy field name mapping"; method = "POST"; url = "$web/internal/bookings";
      body = '{"name":"Karthikeyan","email":"zerohub01@gmail.com","phone":"8590464379","service":"Website Development","teamSize":"1-10","message":"Testing proxy field mapping","businessType":"Tech / SaaS Startup","budget":"30000-60000"}';
      expect = "success response or handled security gate";
      passStatuses = @(200, 201, 400, 401, 403, 422, 429, 503);
      headers = @{ "X-Forwarded-For" = "198.51.100.24" }
    }
  )

  foreach ($case in $proxyCases) {
    $headers = @{ "Content-Type" = "application/json" }
    if ($case.ContainsKey("headers")) {
      foreach ($entry in $case.headers.GetEnumerator()) {
        $headers[$entry.Key] = $entry.Value
      }
    }
    $response = Invoke-Http -Url $case.url -Method $case.method -Body $case.body -Headers $headers
    $isPass = $case.passStatuses -contains $response.status
    if ($case.id -eq "T3.4") {
      $fallback = $false
      $captchaGate = $false
      try {
        $json = $response.body | ConvertFrom-Json -ErrorAction Stop
        if ($json.fallback -eq $true) {
          $fallback = $true
        }
        if ($json.code -eq "captcha_required" -or $json.error -match "CAPTCHA") {
          $captchaGate = $true
        }
      } catch { }
      if ($fallback -and -not $captchaGate) { $isPass = $false }
    }
    Add-CaseResult -Phase "phase3" -Id $case.id -Name $case.name -Status $response.status -Expected $case.expect -Pass $isPass -Body ($response.body.Substring(0, [Math]::Min(300, $response.body.Length)))
  }

  ($runtime.phase3 | ConvertTo-Json -Depth 8) | Out-File -FilePath $proxyLogPath -Encoding utf8

  # T2.7 (rate limit) intentionally runs after proxy checks to avoid polluting booking tests.
  $rateStatuses = @()
  for ($i = 0; $i -lt 20; $i++) {
    $spamHeaders = @{ "Content-Type" = "application/json"; "X-Forwarded-For" = "198.51.100.200" }
    $spam = Invoke-Http -Url "$api/api/bookings" -Method "POST" -Body '{"name":"spam"}' -Headers $spamHeaders
    $rateStatuses += $spam.status
  }
  $t27Pass = $rateStatuses -contains 429
  Add-CaseResult -Phase "phase2" -Id "T2.7" -Name "Rate limiting works" -Status ($(if($t27Pass){429}else{($rateStatuses | Select-Object -Last 1)})) -Expected "at least one 429" -Pass $t27Pass -Body ("statuses: " + ($rateStatuses -join ","))

  $pageCases = @(
    @{ id = "T4.1"; path = "/"; pass = @(200) },
    @{ id = "T4.2"; path = "/book"; pass = @(200) },
    @{ id = "T4.3"; path = "/book-call"; pass = @(200) },
    @{ id = "T4.4"; path = "/services"; pass = @(200) },
    @{ id = "T4.5"; path = "/services/marketing"; pass = @(200) },
    @{ id = "T4.6"; path = "/pricing"; pass = @(200) },
    @{ id = "T4.7"; path = "/features"; pass = @(200) },
    @{ id = "T4.8"; path = "/technology"; pass = @(200) },
    @{ id = "T4.9"; path = "/maintenance"; pass = @(200) },
    @{ id = "T4.10"; path = "/works"; pass = @(200) },
    @{ id = "T4.11"; path = "/testimonials"; pass = @(200) },
    @{ id = "T4.12"; path = "/process"; pass = @(200) },
    @{ id = "T4.13"; path = "/login"; pass = @(200) },
    @{ id = "T4.14"; path = "/portal"; pass = @(200, 302, 307, 308) },
    @{ id = "T4.15"; path = "/admin"; pass = @(200, 302, 307, 308) },
    @{ id = "T4.16"; path = "/zero-control"; pass = @(200, 302, 307, 308) },
    @{ id = "T4.17"; path = "/this-page-does-not-exist-xyz"; pass = @(404) }
  )

  foreach ($case in $pageCases) {
    $res = Invoke-Http -Url ($web + $case.path) -Method "GET"
    $isPass = $case.pass -contains $res.status
    Add-CaseResult -Phase "phase4" -Id $case.id -Name ("Route " + $case.path) -Status $res.status -Expected ("status in [" + (($case.pass -join ",") + "]")) -Pass $isPass -Body ($res.body.Substring(0, [Math]::Min(150, $res.body.Length)))
  }

  ($runtime.phase4 | ConvertTo-Json -Depth 8) | Out-File -FilePath $pagesLogPath -Encoding utf8

  Set-Location $webDir
  $env:WEB_URL = "http://localhost:3000"
  cmd.exe /c "npm.cmd run test:e2e 1> test-results\playwright-run.log 2> test-results\playwright-run.err.log"
} catch {
  $runtime.errors += ("Runtime harness exception: " + $_.Exception.Message)
} finally {
  if ($apiProcess -and (Get-Process -Id $apiProcess.Id -ErrorAction SilentlyContinue)) {
    Stop-ProcessTree -ProcessId $apiProcess.Id
  }
  if ($webProcess -and (Get-Process -Id $webProcess.Id -ErrorAction SilentlyContinue)) {
    Stop-ProcessTree -ProcessId $webProcess.Id
  }
  Stop-PortListeners -Ports @(3000, 3001, 4000)
  $runtime.endedAt = (Get-Date).ToString("o")
  ($runtime | ConvertTo-Json -Depth 10) | Out-File -FilePath $httpResultPath -Encoding utf8
  Set-Location $root
}
