import { resolveDiagramOptions } from '../config/config-resolver.js';
import type {
  DiagramAlign,
  DiagramFit,
  DiagramOptions,
  RawDiagramOptions,
} from '../types/diagram.js';
import { DiagramParseError } from './error.js';

export const ALLOWED_UNITS = ['px', 'mm', 'cm', 'in', '%'] as const;
const VALID_DIMENSION_REGEX = /^(\d+(?:\.\d+)?)(px|mm|cm|in|%)$/;
const VALID_FITS: readonly DiagramFit[] = ['contain', 'fill'];
const VALID_ALIGNS: readonly DiagramAlign[] = ['left', 'center', 'right'];

function validateDimension(attributeName: 'width' | 'height', rawValue: string): string {
  const value = rawValue.trim();

  if (value === 'auto') {
    return value;
  }

  const match = value.match(VALID_DIMENSION_REGEX);
  if (!match) {
    throw new DiagramParseError(`Invalid diagram ${attributeName}: "${value}"`, {
      attributeName,
      invalidValue: value,
    });
  }

  const numericValue = parseFloat(match[1]);
  if (numericValue <= 0) {
    throw new DiagramParseError(
      `Invalid diagram ${attributeName}: "${value}". Value must be greater than 0.`,
      {
        attributeName,
        invalidValue: value,
      }
    );
  }

  return value;
}

function validateFit(rawValue: string): DiagramFit {
  const value = rawValue.trim() as DiagramFit;
  if (!VALID_FITS.includes(value)) {
    throw new DiagramParseError(
      `Invalid diagram fit: "${rawValue.trim()}". Expected "contain" or "fill".`,
      {
        attributeName: 'fit',
        invalidValue: rawValue.trim(),
      }
    );
  }
  return value;
}

function validateAlign(rawValue: string): DiagramAlign {
  const value = rawValue.trim() as DiagramAlign;
  if (!VALID_ALIGNS.includes(value)) {
    throw new DiagramParseError(
      `Invalid diagram align: "${rawValue.trim()}". Expected "left", "center", or "right".`,
      {
        attributeName: 'align',
        invalidValue: rawValue.trim(),
      }
    );
  }
  return value;
}

/**
 * Parses raw diagram attributes without filling default values.
 * Unspecified properties remain undefined.
 */
export function parseRawAttributes(attributesString?: string): RawDiagramOptions {
  const options: RawDiagramOptions = {};

  if (!attributesString || attributesString.trim() === '') {
    return options;
  }

  const trimmed = attributesString.trim();
  // Match key=value pairs with optional single/double quotes
  const pairRegex = /([a-zA-Z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s,}]+))/g;

  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = pairRegex.exec(trimmed)) !== null) {
    // Check if there were unexpected characters between matches
    const skipped = trimmed.slice(lastIndex, match.index).trim();
    if (skipped !== '' && skipped !== ',') {
      throw new DiagramParseError(`Invalid syntax in diagram attributes: "${skipped}"`, {
        invalidValue: skipped,
      });
    }

    const key = match[1].toLowerCase();
    const rawVal = match[2] ?? match[3] ?? match[4];

    switch (key) {
      case 'width':
        options.width = validateDimension('width', rawVal);
        break;
      case 'height':
        options.height = validateDimension('height', rawVal);
        break;
      case 'fit':
        options.fit = validateFit(rawVal);
        break;
      case 'align':
        options.align = validateAlign(rawVal);
        break;
      default:
        throw new DiagramParseError(`Unknown diagram attribute: "${match[1]}"`, {
          attributeName: match[1],
          invalidValue: rawVal,
        });
    }

    lastIndex = pairRegex.lastIndex;
  }

  // Check remaining trailing content
  const remaining = trimmed.slice(lastIndex).trim();
  if (remaining !== '' && remaining !== ',') {
    throw new DiagramParseError(`Invalid syntax in diagram attributes: "${remaining}"`, {
      invalidValue: remaining,
    });
  }

  return options;
}

/**
 * Parses an attribute string such as 'width=160mm height=80mm fit=contain align=center',
 * returning resolved diagram options with built-in defaults applied.
 */
export function parseAttributes(attributesString?: string): DiagramOptions {
  const rawOptions = parseRawAttributes(attributesString);
  return resolveDiagramOptions(rawOptions);
}
