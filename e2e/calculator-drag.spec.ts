import { test, expect } from '@playwright/test'

const DRAG_THRESHOLD = 10

test.describe('Calculatrice - Déplacement', () => {
  test('glisser le bouton flottant en vue desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')

    const toggle = page.getByRole('button', { name: /calculatrice/i })
    await expect(toggle).toBeVisible()

    const boxBefore = await toggle.boundingBox()
    expect(boxBefore).not.toBeNull()

    // Glisser le bouton
    await toggle.hover()
    await page.mouse.down()
    await page.mouse.move(boxBefore!.x + 100, boxBefore!.y + 50, { steps: 10 })
    await page.mouse.up()

    const boxAfter = await toggle.boundingBox()
    expect(boxAfter).not.toBeNull()

    // Position a changé
    expect(boxAfter!.x).toBeGreaterThan(boxBefore!.x + 50)
    expect(boxAfter!.y).toBeGreaterThan(boxBefore!.y + 20)

    // Reste dans l'écran
    expect(boxAfter!.x).toBeGreaterThanOrEqual(0)
    expect(boxAfter!.x + boxAfter!.width).toBeLessThanOrEqual(1280)
    expect(boxAfter!.y).toBeGreaterThanOrEqual(0)
    expect(boxAfter!.y + boxAfter!.height).toBeLessThanOrEqual(800)
  })

  test('glisser le panneau en vue desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')

    const toggle = page.getByRole('button', { name: /calculatrice/i })
    await toggle.click()

    const panel = page.locator('.fixed.z-50.rounded-xl.border.bg-card')
    await expect(panel).toBeVisible()

    const handle = panel.getByText('Calculatrice').locator('..').first()
    // Ou handle avec GripVertical - on clique sur la barre de titre
    const dragHandle = panel.locator('[data-drag-handle]')
    await expect(dragHandle).toBeVisible()

    const boxBefore = await panel.boundingBox()
    expect(boxBefore).not.toBeNull()

    await dragHandle.hover()
    await page.mouse.down()
    await page.mouse.move(boxBefore!.x + 150, boxBefore!.y + 80, { steps: 10 })
    await page.mouse.up()

    const boxAfter = await panel.boundingBox()
    expect(boxAfter).not.toBeNull()

    expect(boxAfter!.x).toBeGreaterThan(boxBefore!.x + 100)
    expect(boxAfter!.y).toBeGreaterThan(boxBefore!.y + 40)
    expect(boxAfter!.x).toBeGreaterThanOrEqual(0)
    expect(boxAfter!.x + boxAfter!.width).toBeLessThanOrEqual(1280)
    expect(boxAfter!.y).toBeGreaterThanOrEqual(0)
    expect(boxAfter!.y + boxAfter!.height).toBeLessThanOrEqual(800)
  })

  test('glisser le bouton flottant en vue mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    const toggle = page.getByRole('button', { name: /calculatrice/i })
    await expect(toggle).toBeVisible()

    const boxBefore = await toggle.boundingBox()
    expect(boxBefore).not.toBeNull()

    await toggle.hover()
    await page.mouse.down()
    await page.mouse.move(boxBefore!.x + 60, boxBefore!.y + 120, { steps: 10 })
    await page.mouse.up()

    const boxAfter = await toggle.boundingBox()
    expect(boxAfter).not.toBeNull()
    expect(boxAfter!.x).not.toBeCloseTo(boxBefore!.x, 0)
    expect(boxAfter!.x).toBeGreaterThanOrEqual(0)
    expect(boxAfter!.x + boxAfter!.width).toBeLessThanOrEqual(390)
    expect(boxAfter!.y).toBeGreaterThanOrEqual(0)
    expect(boxAfter!.y + boxAfter!.height).toBeLessThanOrEqual(844)
  })

  test('glisser le panneau en vue mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    const toggle = page.getByRole('button', { name: /calculatrice/i })
    await toggle.click()

    const panel = page.locator('.fixed.z-50.rounded-xl.border.bg-card')
    await expect(panel).toBeVisible()

    const dragHandle = panel.locator('[data-drag-handle]')
    await expect(dragHandle).toBeVisible()

    const boxBefore = await panel.boundingBox()
    expect(boxBefore).not.toBeNull()

    await dragHandle.hover()
    await page.mouse.down()
    await page.mouse.move(boxBefore!.x + 40, boxBefore!.y + 150, { steps: 10 })
    await page.mouse.up()

    const boxAfter = await panel.boundingBox()
    expect(boxAfter).not.toBeNull()
    expect(boxAfter!.y).toBeGreaterThan(boxBefore!.y + 50)
    expect(boxAfter!.x).toBeGreaterThanOrEqual(0)
    expect(boxAfter!.x + boxAfter!.width).toBeLessThanOrEqual(390)
    expect(boxAfter!.y).toBeGreaterThanOrEqual(0)
    expect(boxAfter!.y + boxAfter!.height).toBeLessThanOrEqual(844)
  })
})
