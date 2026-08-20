# Recording script for the README demo GIF.
#
# Regenerate with:
#   npm run build && npm link && vhs assets/demo.tape && npm unlink -g subagent-insights
#
# Runs --demo, so the recording never reads real transcripts.

Output assets/demo.gif

Set Shell "bash"
Set FontSize 14
Set Width 1080
Set Height 1310
Set Padding 20
Set Theme "Catppuccin Mocha"
Set TypingSpeed 60ms

Hide
Type "clear"
Enter
Show

Sleep 800ms
Type "npx subagent-insights --demo"
Sleep 400ms
Enter
Sleep 7s
