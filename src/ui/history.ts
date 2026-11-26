/**
 * Undo/redo for the drawing. The desktop EKTS had none; this is a mobile
 * addition, since a slip of the finger is easy on a touch screen. Each step
 * is the whole circuit as saved to a file, so undoing restores exactly
 * what was there.
 */
import { CircuitDocument } from '../ekts/document';

const LIMIT = 100;

export class History {
  private steps: string[] = [];
  private index = -1;

  reset(doc: CircuitDocument) {
    this.steps = [JSON.stringify(doc.toCircuit())];
    this.index = 0;
  }

  /** Record the document if it differs from the current step. */
  commit(doc: CircuitDocument): boolean {
    const s = JSON.stringify(doc.toCircuit());
    if (s === this.steps[this.index]) return false;
    this.steps = this.steps.slice(0, this.index + 1);
    this.steps.push(s);
    if (this.steps.length > LIMIT) this.steps.shift();
    this.index = this.steps.length - 1;
    return true;
  }

  get canUndo() {
    return this.index > 0;
  }

  get canRedo() {
    return this.index < this.steps.length - 1;
  }

  undo(doc: CircuitDocument) {
    if (!this.canUndo) return;
    this.index--;
    this.restore(doc);
  }

  redo(doc: CircuitDocument) {
    if (!this.canRedo) return;
    this.index++;
    this.restore(doc);
  }

  private restore(doc: CircuitDocument) {
    doc.replaceWith(CircuitDocument.fromCircuit(JSON.parse(this.steps[this.index])));
  }
}
