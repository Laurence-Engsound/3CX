#!/usr/bin/env node
// Convert all .svg files in this folder to .png at 1600px width
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const dir = __dirname
const svgs = fs.readdirSync(dir).filter(f => f.endsWith('.svg')).sort()

;(async () => {
  for (const f of svgs) {
    const svgPath = path.join(dir, f)
    const pngPath = path.join(dir, f.replace(/\.svg$/, '.png'))
    try {
      const info = await sharp(svgPath, { density: 150 })
        .resize(1600, null, { withoutEnlargement: false })
        .png()
        .toFile(pngPath)
      console.log(`✓ ${f}  →  ${info.width}×${info.height}  ${(info.size/1024).toFixed(0)}KB`)
    } catch (e) {
      console.error(`✗ ${f}: ${e.message}`)
    }
  }
})()
