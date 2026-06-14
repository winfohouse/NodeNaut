import { SELECTOR_CONFIDENCE, type SelectorScore } from '../types/scanner';
import { DOMUtils } from './dom';

export interface ElementSpec {
  tagName: string;
  innerText: string;
  role: string;
  className: string;
  id: string;
  name: string;
  rect: { x: number, y: number, w: number, h: number };
}

export class SelectorBuilder {
  /**
   * Generates a list of candidate selectors for an element with confidence scores.
   */
  static build(element: HTMLElement): SelectorScore[] {
    const scores: SelectorScore[] = [];

    // 1. ID (Highest confidence)
    if (element.id && !this.isDynamic(element.id)) {
      scores.push({
        selector: `#${element.id}`,
        type: 'ID',
        confidence: SELECTOR_CONFIDENCE.ID
      });
    }

    // 2. HYBRID (Combination: Tag + Classes + Nth) - Requested by user
    const hybrid = this.generateHybridSelector(element);
    if (hybrid) {
      scores.push({
        selector: hybrid,
        type: 'HYBRID',
        confidence: SELECTOR_CONFIDENCE.HYBRID
      });
    }

    // 3. Name attribute
    const name = element.getAttribute('name');
    if (name) {
      scores.push(this.disambiguate(element, `[name="${name}"]`, 'NAME', SELECTOR_CONFIDENCE.NAME));
    }

    // 4. Aria Label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      scores.push(this.disambiguate(element, `[aria-label="${ariaLabel}"]`, 'ARIA', SELECTOR_CONFIDENCE.ARIA));
    }

    // 5. Placeholder
    const placeholder = element.getAttribute('placeholder');
    if (placeholder) {
      scores.push(this.disambiguate(element, `[placeholder="${placeholder}"]`, 'PLACEHOLDER', SELECTOR_CONFIDENCE.PLACEHOLDER));
    }

    // 6. Classes
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(/\s+/).filter(c => c && !this.isDynamic(c));
      if (classes.length > 0) {
        scores.push(this.disambiguate(element, `.${classes.join('.')}`, 'CLASS', SELECTOR_CONFIDENCE.CLASS));
      }
    }

    // 7. Basic Tag path (Fallback)
    scores.push(this.disambiguate(element, element.tagName.toLowerCase(), 'RELATIVE', SELECTOR_CONFIDENCE.RELATIVE));

    // 8. XPath (Last resort)
    const xpath = this.getXPath(element);
    if (xpath) {
      scores.push({
        selector: xpath,
        type: 'XPATH',
        confidence: SELECTOR_CONFIDENCE.XPATH
      });
    }

    return scores.sort((a, b) => b.confidence - a.confidence);
  }

  static getSpec(el: HTMLElement): ElementSpec {
    const rect = el.getBoundingClientRect();
    return {
      tagName: el.tagName.toLowerCase(),
      innerText: el.innerText?.substring(0, 100) || '',
      role: el.getAttribute('role') || '',
      className: el.className || '',
      id: el.id || '',
      name: el.getAttribute('name') || '',
      rect: { x: rect.left + window.scrollX, y: rect.top + window.scrollY, w: rect.width, h: rect.height }
    };
  }

  private static generateHybridSelector(el: HTMLElement): string {
    const tag = el.tagName.toLowerCase();
    let selector = tag;

    if (el.id && !this.isDynamic(el.id)) {
      selector += `#${el.id}`;
    }

    if (el.className && typeof el.className === 'string') {
      const classes = el.className.split(/\s+/).filter(c => c && !this.isDynamic(c));
      if (classes.length > 0) {
        selector += `.${classes.join('.')}`;
      }
    }

    // Add positional nth-of-type for robustness
    let index = 1;
    let sib = el.previousElementSibling;
    while (sib) {
      if (sib.tagName === el.tagName) index++;
      sib = sib.previousElementSibling;
    }
    selector += `:nth-of-type(${index})`;

    return selector;
  }

  private static disambiguate(element: HTMLElement, selector: string, type: any, confidence: number): SelectorScore {
    try {
      const matches = DOMUtils.querySelectorAllDeep(selector);
      if (matches.length <= 1) {
        return { selector, type, confidence };
      }

      // Find index of our element among matches
      let index = 0;
      for (let i = 0; i < matches.length; i++) {
        if (matches[i] === element) {
          index = i;
          break;
        }
      }

      return {
        selector,
        index,
        type,
        confidence: confidence - 5 
      };
    } catch (e) {
      return { selector, type, confidence };
    }
  }

  private static getXPath(element: HTMLElement): string {
    if (element.id && !this.isDynamic(element.id)) return `//*[@id="${element.id}"]`;
    const paths = [];
    for (; element && element.nodeType === Node.ELEMENT_NODE; element = element.parentNode as HTMLElement) {
      let index = 0;
      for (let sibling = element.previousSibling; sibling; sibling = sibling.previousSibling) {
        if (sibling.nodeType === Node.DOCUMENT_TYPE_NODE) continue;
        if (sibling.nodeName === element.nodeName) ++index;
      }
      const tagName = element.nodeName.toLowerCase();
      const pathIndex = (index ? `[${index + 1}]` : '');
      paths.splice(0, 0, tagName + pathIndex);
    }
    return paths.length ? '/' + paths.join('/') : '';
  }

  private static isDynamic(value: string): boolean {
    if (typeof value !== 'string') return true;
    const longNumeric = /\d{6,}/;
    const guidPattern = /[a-f0-9]{12,}/i;
    return longNumeric.test(value) || guidPattern.test(value);
  }
}

export class SelectorHealer {
  /**
   * Attempts to find an element using multiple candidate selectors.
   * If all fail, tries coordinate-based healing.
   */
  static findElement(candidates: SelectorScore[], spec?: ElementSpec): { element: HTMLElement | null; selector: string | null } {
    if (!candidates || candidates.length === 0) return { element: null, selector: null };

    // 1. Try standard strategies
    const validCandidates = (candidates || []).filter(c => c.selector && c.selector.trim().length > 0);
    for (const candidate of validCandidates) {
      try {
        const matches = DOMUtils.querySelectorAllDeep(candidate.selector);
        const index = candidate.index || 0;
        const element = matches[index];

        if (element instanceof HTMLElement) {
          if (DOMUtils.isVisible(element)) {
            // Optional: check if it's a "good" match based on spec even if found via selector
            if (spec && spec.tagName && this.calculateSimilarity(element, spec) < 0.5) {
              continue; // Selector found wrong element (false positive)
            }
            return { element, selector: candidate.selector };
          }
        }
      } catch (e) {}
    }

    // 2. Self-Healing: Coordinate-based discovery as requested
    if (spec && spec.rect && spec.rect.w > 0) {
      try {
        const elAtPoint = document.elementFromPoint(
          spec.rect.x - window.scrollX + (spec.rect.w / 2),
          spec.rect.y - window.scrollY + (spec.rect.h / 2)
        ) as HTMLElement;

        if (elAtPoint) {
          const similarity = this.calculateSimilarity(elAtPoint, spec);
          if (similarity >= 0.9) {
            console.log(`[SelectorHealer] Self-healed via coordinates! Similarity: ${(similarity * 100).toFixed(1)}%`);
            return { element: elAtPoint, selector: 'COORDINATE_HEALED' };
          }
        }
      } catch (e) {}
    }

    return { element: null, selector: null };
  }

  private static calculateSimilarity(el: HTMLElement, spec: ElementSpec): number {
    if (!el || !spec || !spec.tagName) return 0;
    
    let score = 0;
    let total = 0;

    const check = (actual: string, expected: string, weight: number) => {
      total += weight;
      if (!expected) return; // Skip if no expectation
      if (actual === expected) score += weight;
      else if (actual.includes(expected) || expected.includes(actual)) score += weight * 0.5;
    };

    check(el.tagName.toLowerCase(), spec.tagName, 10);
    check(el.id || '', spec.id || '', 10);
    check(el.getAttribute('name') || '', spec.name || '', 10);
    check(el.getAttribute('role') || '', spec.role || '', 5);
    
    // Text content similarity
    total += 20;
    if (spec.innerText) {
      const actualText = el.innerText?.substring(0, 100) || '';
      if (actualText === spec.innerText) score += 20;
      else if (actualText.includes(spec.innerText) || spec.innerText.includes(actualText)) score += 10;
    }

    return score / total;
  }
}
