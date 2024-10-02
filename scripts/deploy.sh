npm run build && git sw gh-pages && rm -rf presets/ misc static && cp -r build/* . && git add -A && git cm "update" && git push && git sw sz/picto-in-the-shell 
