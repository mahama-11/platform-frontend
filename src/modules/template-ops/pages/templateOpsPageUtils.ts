import type { TemplateOpsImportPreviewAssetCheck } from '@/shared/types/platform'

export function readFileAsDataURL(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export function buildAssetOptionKey(asset: TemplateOpsImportPreviewAssetCheck) {
  return `${asset.product_code}::${asset.source_ref}`
}

export function suggestMissingAssetKey(fileName: string, assets: TemplateOpsImportPreviewAssetCheck[]) {
  const scored = assets
    .map(asset => ({ key: buildAssetOptionKey(asset), score: sourceRefMatchScore(fileName, asset.source_ref) }))
    .filter(item => item.score > 0)
    .sort((left, right) => right.score - left.score)
  return scored[0]?.key || ''
}

function sourceRefMatchScore(fileName: string, sourceRef: string) {
  const normalizedFile = normalizeComparable(fileName.replace(/\.[^.]+$/, ''))
  const sourceSegments = sourceRef.split('/').filter(Boolean)
  const templateCode = normalizeComparable(sourceSegments[sourceSegments.length - 2] || '')
  const exampleName = normalizeComparable(sourceSegments[sourceSegments.length - 1] || '')
  let score = 0
  if (templateCode && normalizedFile.includes(templateCode)) score += 3
  if (exampleName && normalizedFile.includes(exampleName)) score += 2
  if (normalizedFile && normalizeComparable(sourceRef).includes(normalizedFile)) score += 1
  return score
}

function normalizeComparable(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

export function fileTitleFromName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
}
