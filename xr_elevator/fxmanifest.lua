fx_version 'cerulean'
game 'gta5'

author 'Uğur "XARON" Pekesen'
description 'Synced elevator script for FiveM'
version '1.0.0'

resource_type 'gametype' { name = 'RPG' }

ui_page "ui/ui.html"

files({
    "ui/ui.html",
    "ui/ui.css"
})

client_script {"client.js"}
server_script {"server.js"}