/**
 * KML/KMZ Parser Utilities
 * Uses browser native DOMParser (not Node.js libraries)
 * Supports parsing Polygon coordinates from KML and KMZ files
 */

import JSZip from 'jszip'
import type { ZonePoint } from '@/types/zone'

export interface KmlParseResult {
  success: boolean
  coordinates?: ZonePoint[]
  error?: string
  type?: 'polygon' | 'point' | 'linestring'
}

/**
 * Extract KML content from KMZ (ZIP) file
 */
async function extractKmlFromKmz(file: File): Promise<string> {
  const zip = new JSZip()
  const loaded = await zip.loadAsync(file)

  // Find doc.kml in the zip
  let kmlContent: string | null = null

  for (const [filename, fileObj] of Object.entries(loaded.files)) {
    if (filename.toLowerCase().endsWith('.kml')) {
      kmlContent = await fileObj.async('string')
      break
    }
  }

  if (!kmlContent) {
    throw new Error('No KML file found in KMZ archive')
  }

  return kmlContent
}

/**
 * Parse KML/KMZ file and extract polygon coordinates
 * Uses browser native DOMParser
 */
export async function parseKmlFile(file: File): Promise<KmlParseResult> {
  try {
    // Validate file type
    const fileName = file.name.toLowerCase()
    const isKml = fileName.endsWith('.kml')
    const isKmz = fileName.endsWith('.kmz')

    if (!isKml && !isKmz) {
      return {
        success: false,
        error: 'File must be .kml or .kmz format',
      }
    }

    // Get KML content
    let kmlContent: string

    if (isKmz) {
      kmlContent = await extractKmlFromKmz(file)
    } else {
      kmlContent = await file.text()
    }

    // Parse XML using browser native DOMParser
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(kmlContent, 'application/xml')

    // Check for parsing errors
    if (xmlDoc.documentElement.nodeName === 'parsererror') {
      return {
        success: false,
        error: 'Invalid KML XML structure',
      }
    }

    // Extract placemarks
    const placemarks = extractPlacemarks(xmlDoc)

    if (placemarks.length === 0) {
      return {
        success: false,
        error: 'No placemarks found in KML file',
      }
    }

    // Return first polygon found
    for (const placemark of placemarks) {
      if (placemark.type === 'polygon' && placemark.coordinates) {
        return {
          success: true,
          coordinates: placemark.coordinates,
          type: 'polygon',
        }
      }
    }

    // If no polygon, show error
    const types = placemarks.map(p => p.type)
    return {
      success: false,
      error: `Only Polygon geometries are supported. Found: ${types.join(', ')}`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      error: `KML parsing error: ${message}`,
    }
  }
}

/**
 * Extract all placemarks from KML document
 */
function extractPlacemarks(
  xmlDoc: Document
): Array<{ type: 'polygon' | 'point' | 'linestring'; coordinates?: ZonePoint[] }> {
  const placemarks: Array<{ type: 'polygon' | 'point' | 'linestring'; coordinates?: ZonePoint[] }> = []

  // Find all Placemark elements
  const placemarksArray = xmlDoc.getElementsByTagName('Placemark')

  for (let i = 0; i < placemarksArray.length; i++) {
    const placemark = placemarksArray[i]

    // Check for Polygon
    const polygons = placemark.getElementsByTagName('Polygon')
    if (polygons.length > 0) {
      const coords = extractPolygonCoordinates(polygons[0])
      if (coords.length >= 3) {
        placemarks.push({
          type: 'polygon',
          coordinates: coords,
        })
      }
      continue
    }

    // Check for Point
    const points = placemark.getElementsByTagName('Point')
    if (points.length > 0) {
      placemarks.push({
        type: 'point',
      })
      continue
    }

    // Check for LineString
    const linestrings = placemark.getElementsByTagName('LineString')
    if (linestrings.length > 0) {
      placemarks.push({
        type: 'linestring',
      })
      continue
    }
  }

  return placemarks
}

/**
 * Extract coordinates from Polygon geometry
 * Expects format: "lng,lat[,elevation] lng,lat[,elevation] ..."
 */
function extractPolygonCoordinates(polygon: Element): ZonePoint[] {
  const coords: ZonePoint[] = []

  try {
    // Find outerBoundaryIs element
    const outerBoundaries = polygon.getElementsByTagName('outerBoundaryIs')

    if (outerBoundaries.length === 0) {
      return coords
    }

    const outerBoundary = outerBoundaries[0]

    // Find LinearRing element
    const linearRings = outerBoundary.getElementsByTagName('LinearRing')

    if (linearRings.length === 0) {
      return coords
    }

    const linearRing = linearRings[0]

    // Find coordinates element
    const coordinatesElements = linearRing.getElementsByTagName('coordinates')

    if (coordinatesElements.length === 0) {
      return coords
    }

    const coordinatesElement = coordinatesElements[0]
    const coordinatesText = coordinatesElement.textContent?.trim() || ''

    if (!coordinatesText) {
      return coords
    }

    // Parse coordinates
    // Format: "lng,lat[,elevation] lng,lat[,elevation] ..."
    const coordPairs = coordinatesText.split(/\s+/).filter(Boolean)

    for (const pair of coordPairs) {
      const parts = pair.split(',')

      if (parts.length < 2) continue

      const lng = parseFloat(parts[0])
      const lat = parseFloat(parts[1])
      // elevation (parts[2]) is ignored for now

      if (!Number.isNaN(lng) && !Number.isNaN(lat)) {
        coords.push({ lat, lng })
      }
    }

    // Remove duplicate closing coordinate if present
    if (
      coords.length > 1 &&
      coords[0].lat === coords[coords.length - 1].lat &&
      coords[0].lng === coords[coords.length - 1].lng
    ) {
      coords.pop()
    }
  } catch (error) {
    console.error('Error extracting polygon coordinates:', error)
  }

  return coords
}

/**
 * Validate KML file before upload
 */
export async function validateKmlFile(file: File): Promise<{ valid: boolean; error?: string }> {
  try {
    const fileName = file.name.toLowerCase()

    if (!fileName.endsWith('.kml') && !fileName.endsWith('.kmz')) {
      return {
        valid: false,
        error: 'File must be .kml or .kmz',
      }
    }

    // Check file size (max 10 MB)
    if (file.size > 10 * 1024 * 1024) {
      return {
        valid: false,
        error: 'File size must be less than 10 MB',
      }
    }

    // Try parsing to validate structure
    const result = await parseKmlFile(file)

    if (!result.success) {
      return {
        valid: false,
        error: result.error,
      }
    }

    return {
      valid: true,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      valid: false,
      error: `Validation error: ${message}`,
    }
  }
}
