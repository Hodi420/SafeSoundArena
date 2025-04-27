$date = Get-Date -Format yyyyMMdd-HHmm
Compress-Archive -Path logs/*,server/agent-config.json -DestinationPath backup-$date.zip
