import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnnotationCanvas from '../../components/AnnotationCanvas';
import {
  createCircleAnnotation,
  createRectangleAnnotation,
  createFreehandAnnotation,
  createAnnotationWithComments,
} from '../../test/factories';
import type { Annotation, ShapeType, RectangleData, FreehandData } from '../../types';

// ---------- Helpers ----------

function renderCanvas(props: Partial<React.ComponentProps<typeof AnnotationCanvas>> = {}) {
  const defaultProps: React.ComponentProps<typeof AnnotationCanvas> = {
    imageUrl: '/test-image.jpg',
    annotations: [],
    selectedAnnotation: null,
    annotationMode: false,
    onSelectAnnotation: vi.fn(),
    onCreateAnnotation: vi.fn(),
    ...props,
  };

  const result = render(<AnnotationCanvas {...defaultProps} />);

  return { ...result, props: defaultProps };
}

/** Simulate image load so the SVG overlay becomes visible */
function loadImage() {
  const img = screen.getByAltText('Annotated image');
  fireEvent.load(img);
}

/**
 * Get the main container div (the one with onMouseDown etc.)
 * We use the image's parent since the container is the root div.
 */
function getContainer() {
  return screen.getByAltText('Annotated image').closest('div')!;
}

// ---------- Tests ----------

describe('AnnotationCanvas', () => {
  describe('rendering', () => {
    it('renders the image with correct src', () => {
      renderCanvas({ imageUrl: '/my-photo.jpg' });
      const img = screen.getByAltText('Annotated image');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/my-photo.jpg');
    });

    it('shows loading spinner before image loads', () => {
      const { container } = renderCanvas();
      // Before load, the SVG overlay should not be present
      expect(container.querySelector('svg')).toBeNull();
    });

    it('renders SVG overlay after image loads', () => {
      const { container } = renderCanvas();
      loadImage();
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('does not render drawing tool toolbar when not in annotation mode', () => {
      renderCanvas({ annotationMode: false });
      expect(screen.queryByTitle('Freehand')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Rectangle')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Circle')).not.toBeInTheDocument();
    });

    it('renders drawing tool toolbar when in annotation mode', () => {
      renderCanvas({ annotationMode: true });
      expect(screen.getByTitle('Freehand')).toBeInTheDocument();
      expect(screen.getByTitle('Rectangle')).toBeInTheDocument();
      expect(screen.getByTitle('Circle')).toBeInTheDocument();
    });
  });

  describe('annotation shapes rendering', () => {
    it('renders circle annotation as an ellipse', () => {
      const ann = createCircleAnnotation({
        id: 'c1',
        centerX: 40,
        centerY: 60,
        radius: 15,
        status: 'OPEN',
      });
      const { container } = renderCanvas({ annotations: [ann] });
      loadImage();

      const ellipse = container.querySelector('ellipse:not([cx="40"])') || container.querySelector(`ellipse[cx="40"]`);
      // Find the annotation ellipse (not preview)
      const ellipses = container.querySelectorAll('ellipse');
      const annEllipse = Array.from(ellipses).find(
        (el) => el.getAttribute('cx') === '40' && el.getAttribute('cy') === '60'
      );
      expect(annEllipse).toBeInTheDocument();
      expect(annEllipse).toHaveAttribute('rx', '15');
      expect(annEllipse).toHaveAttribute('ry', '15');
    });

    it('renders rectangle annotation as a rect', () => {
      const ann = createRectangleAnnotation({
        id: 'r1',
        shapeData: { x: 10, y: 20, width: 30, height: 25 },
      });
      const { container } = renderCanvas({ annotations: [ann] });
      loadImage();

      const rects = container.querySelectorAll('rect');
      const annRect = Array.from(rects).find(
        (el) => el.getAttribute('x') === '10' && el.getAttribute('y') === '20'
      );
      expect(annRect).toBeInTheDocument();
      expect(annRect).toHaveAttribute('width', '30');
      expect(annRect).toHaveAttribute('height', '25');
    });

    it('renders freehand annotation as a polygon', () => {
      const ann = createFreehandAnnotation({ id: 'f1' });
      const { container } = renderCanvas({ annotations: [ann] });
      loadImage();

      const polygons = container.querySelectorAll('polygon');
      expect(polygons.length).toBeGreaterThanOrEqual(1);
      // The polygon should have points attribute
      const annPolygon = polygons[0];
      expect(annPolygon).toHaveAttribute('points');
      expect(annPolygon.getAttribute('points')).toContain(',');
    });

    it('applies correct status colors - OPEN (red)', () => {
      const ann = createCircleAnnotation({ id: 'open1', status: 'OPEN' });
      const { container } = renderCanvas({ annotations: [ann] });
      loadImage();

      const ellipses = container.querySelectorAll('ellipse');
      // Find the annotation shape (first non-badge ellipse)
      const shape = Array.from(ellipses).find((el) => el.getAttribute('rx') !== '1.8');
      expect(shape).toHaveAttribute('stroke', '#EF4444');
    });

    it('applies correct status colors - RESOLVED (green)', () => {
      const ann = createCircleAnnotation({ id: 'res1', status: 'RESOLVED' });
      const { container } = renderCanvas({ annotations: [ann] });
      loadImage();

      const ellipses = container.querySelectorAll('ellipse');
      const shape = Array.from(ellipses).find((el) => el.getAttribute('rx') !== '1.8');
      expect(shape).toHaveAttribute('stroke', '#22C55E');
    });

    it('applies correct status colors - DISMISSED (gray, dashed)', () => {
      const ann = createCircleAnnotation({ id: 'dis1', status: 'DISMISSED' });
      const { container } = renderCanvas({ annotations: [ann] });
      loadImage();

      const ellipses = container.querySelectorAll('ellipse');
      const shape = Array.from(ellipses).find((el) => el.getAttribute('rx') !== '1.8');
      expect(shape).toHaveAttribute('stroke', '#9CA3AF');
      expect(shape).toHaveAttribute('stroke-dasharray', '1 0.5');
    });

    it('highlights selected annotation in blue', () => {
      const ann = createCircleAnnotation({ id: 'sel1', centerX: 50, centerY: 50, radius: 10 });
      const { container } = renderCanvas({
        annotations: [ann],
        selectedAnnotation: 'sel1',
      });
      loadImage();

      const ellipses = container.querySelectorAll('ellipse');
      const shape = Array.from(ellipses).find(
        (el) => el.getAttribute('cx') === '50' && el.getAttribute('cy') === '50' && el.getAttribute('rx') === '10'
      );
      expect(shape).toHaveAttribute('stroke', '#3B82F6');
      expect(shape).toHaveAttribute('stroke-width', '0.6');
    });

    it('renders number badges for annotations', () => {
      const annotations = [
        createCircleAnnotation({ id: 'a1' }),
        createCircleAnnotation({ id: 'a2' }),
      ];
      const { container } = renderCanvas({ annotations });
      loadImage();

      const texts = container.querySelectorAll('text');
      const badgeTexts = Array.from(texts)
        .map((t) => t.textContent)
        .filter((t) => t === '1' || t === '2');
      expect(badgeTexts).toContain('1');
      expect(badgeTexts).toContain('2');
    });

    it('renders comment count badge when annotation has comments', () => {
      const ann = createAnnotationWithComments(3, { id: 'wc1' });
      const { container } = renderCanvas({ annotations: [ann] });
      loadImage();

      const texts = container.querySelectorAll('text');
      const commentBadge = Array.from(texts).find((t) => t.textContent === '3');
      expect(commentBadge).toBeInTheDocument();
    });

    it('does not render comment count badge when no comments', () => {
      const ann = createCircleAnnotation({ id: 'nc1', comments: [] });
      const { container } = renderCanvas({ annotations: [ann] });
      loadImage();

      // Should only have the number badge "1", not a comment count
      const texts = container.querySelectorAll('text');
      expect(texts).toHaveLength(1);
      expect(texts[0].textContent).toBe('1');
    });

    it('renders multiple annotations of different types', () => {
      const annotations = [
        createCircleAnnotation({ id: 'mix-c', centerX: 20, centerY: 20, radius: 5 }),
        createRectangleAnnotation({ id: 'mix-r', shapeData: { x: 50, y: 50, width: 20, height: 10 } }),
        createFreehandAnnotation({ id: 'mix-f' }),
      ];
      const { container } = renderCanvas({ annotations });
      loadImage();

      // Should have ellipse, rect, and polygon
      expect(container.querySelectorAll('ellipse').length).toBeGreaterThanOrEqual(1);
      expect(container.querySelectorAll('rect').length).toBeGreaterThanOrEqual(1);
      expect(container.querySelectorAll('polygon').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('drawing tool selection', () => {
    it('defaults to FREEHAND tool', () => {
      renderCanvas({ annotationMode: true });
      const freehandBtn = screen.getByTitle('Freehand');
      // The active tool should have the red styling
      expect(freehandBtn.className).toContain('bg-red-50');
    });

    it('can switch to RECTANGLE tool', async () => {
      const user = userEvent.setup();
      renderCanvas({ annotationMode: true });

      const rectBtn = screen.getByTitle('Rectangle');
      await user.click(rectBtn);

      expect(rectBtn.className).toContain('bg-red-50');
      // Freehand should no longer be active
      expect(screen.getByTitle('Freehand').className).not.toContain('bg-red-50');
    });

    it('can switch to CIRCLE tool', async () => {
      const user = userEvent.setup();
      renderCanvas({ annotationMode: true });

      const circleBtn = screen.getByTitle('Circle');
      await user.click(circleBtn);

      expect(circleBtn.className).toContain('bg-red-50');
    });

    it('tool buttons stop propagation on mousedown', () => {
      renderCanvas({ annotationMode: true });
      const btn = screen.getByTitle('Rectangle');
      const mouseDown = new MouseEvent('mousedown', { bubbles: true });
      const stopPropSpy = vi.spyOn(mouseDown, 'stopPropagation');
      btn.dispatchEvent(mouseDown);
      expect(stopPropSpy).toHaveBeenCalled();
    });
  });

  describe('annotation selection', () => {
    it('calls onSelectAnnotation when clicking an annotation', () => {
      const onSelect = vi.fn();
      const ann = createCircleAnnotation({ id: 'click1' });
      const { container } = renderCanvas({
        annotations: [ann],
        onSelectAnnotation: onSelect,
      });
      loadImage();

      // Find the <g> element (annotation group) and click it
      const groups = container.querySelectorAll('g');
      expect(groups.length).toBeGreaterThan(0);
      fireEvent.click(groups[0]);

      expect(onSelect).toHaveBeenCalledWith('click1');
    });

    it('toggles selection off when clicking already selected annotation', () => {
      const onSelect = vi.fn();
      const ann = createCircleAnnotation({ id: 'toggle1' });
      const { container } = renderCanvas({
        annotations: [ann],
        selectedAnnotation: 'toggle1',
        onSelectAnnotation: onSelect,
      });
      loadImage();

      const groups = container.querySelectorAll('g');
      fireEvent.click(groups[0]);

      expect(onSelect).toHaveBeenCalledWith(null);
    });

    it('does not select annotation when in annotation mode', () => {
      const onSelect = vi.fn();
      const ann = createCircleAnnotation({ id: 'nosel1' });
      const { container } = renderCanvas({
        annotations: [ann],
        annotationMode: true,
        onSelectAnnotation: onSelect,
      });
      loadImage();

      const groups = container.querySelectorAll('g');
      fireEvent.click(groups[0]);

      expect(onSelect).not.toHaveBeenCalled();
    });

    it('deselects when clicking background', () => {
      const onSelect = vi.fn();
      const ann = createCircleAnnotation({ id: 'bg1' });
      renderCanvas({
        annotations: [ann],
        selectedAnnotation: 'bg1',
        onSelectAnnotation: onSelect,
      });
      loadImage();

      const container = getContainer();
      fireEvent.click(container);

      expect(onSelect).toHaveBeenCalledWith(null);
    });
  });

  describe('mouse leave behavior', () => {
    it('resets drag state on mouse leave', () => {
      const onCreateAnnotation = vi.fn();
      renderCanvas({
        annotationMode: true,
        onCreateAnnotation,
      });
      loadImage();

      const container = getContainer();

      // Start a drag
      fireEvent.mouseDown(container, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(container, { clientX: 150, clientY: 150 });

      // Leave the canvas - should cancel drawing
      fireEvent.mouseLeave(container);

      // Mouse up should not create annotation since we left
      fireEvent.mouseUp(container);
      expect(onCreateAnnotation).not.toHaveBeenCalled();
    });
  });

  describe('image loading state', () => {
    it('shows the image element', () => {
      renderCanvas({ imageUrl: '/test.jpg' });
      expect(screen.getByAltText('Annotated image')).toBeInTheDocument();
    });

    it('image is not draggable', () => {
      renderCanvas();
      expect(screen.getByAltText('Annotated image')).toHaveAttribute('draggable', 'false');
    });
  });

  describe('annotation mode styling', () => {
    it('applies annotation-mode class when in annotation mode', () => {
      renderCanvas({ annotationMode: true });
      const container = getContainer();
      expect(container.className).toContain('annotation-mode');
    });

    it('does not apply annotation-mode class when not in annotation mode', () => {
      renderCanvas({ annotationMode: false });
      const container = getContainer();
      expect(container.className).not.toContain('annotation-mode');
    });
  });
});
