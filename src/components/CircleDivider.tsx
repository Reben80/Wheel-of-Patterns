import React, { useState, useRef, useEffect } from 'react';

type Point = { x: number; y: number };
type DrawnLine = { start: Point; end: Point; color: string; thickness: number };

const RuleVisualizer: React.FC<{ rule: string, divisions: number }> = ({ rule, divisions }) => {
  const [start, offset] = rule.split('+').map(Number);
  const end = (start + offset) % divisions;

  return (
    <div className="flex items-center space-x-2">
      <span className="font-mono">{start}</span>
      <svg width="50" height="20">
        <line x1="0" y1="10" x2="50" y2="10" stroke="black" strokeWidth="2" />
        <polygon points="45,5 50,10 45,15" fill="black" />
      </svg>
      <span className="font-mono">{end}</span>
      <span className="text-gray-500">({offset} steps)</span>
    </div>
  );
};

const RuleExplanation: React.FC = () => (
  <div className="bg-white p-4 rounded shadow-lg max-w-md">
    <h3 className="font-bold mb-2">How Rules Work</h3>
    <p>Rules define connections between points on the circle:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Format: start+steps</li>
      <li>"start" is the starting point number</li>
      <li>"steps" is how many points to move clockwise</li>
      <li>Example: 0+3 connects point 0 to point 3, 1 to 4, 2 to 5, and so on</li>
      <li>Rules apply to all points, creating a repeating pattern</li>
      <li>Multiple rules create complex, overlapping patterns</li>
    </ul>
  </div>
);

const CircleDivider: React.FC = () => {
  const [divisions, setDivisions] = useState(12);
  const [rules, setRules] = useState<string[]>([]);
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#000000');
  const [showRuleLines, setShowRuleLines] = useState(true);
  const [showOnlyPattern, setShowOnlyPattern] = useState(false);
  const [currentRule, setCurrentRule] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [drawnLines, setDrawnLines] = useState<DrawnLine[]>([]);
  const [undoStack, setUndoStack] = useState<DrawnLine[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawnLine[][]>([]);
  const [showInstructions, setShowInstructions] = useState(true);
  const [lineThickness, setLineThickness] = useState(2);
  const [freeDrawing, setFreeDrawing] = useState(false);
  const [showRuleExplanation, setShowRuleExplanation] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const canvasSize = 800;
  const radius = canvasSize / 2.5;
  const center = canvasSize / 2;
  const ruleLineColor = "#4A5568";  // Darker color for better contrast
  const dotRadius = 5;
  const fontSize = 16;

  useEffect(() => {
    if (canvasRef.current) {
      ctxRef.current = canvasRef.current.getContext('2d');
      if (ctxRef.current) {
        ctxRef.current.lineCap = 'round';
        ctxRef.current.lineWidth = 2;
      }
      drawCircle();
    }
  }, [divisions, rules, showRuleLines, showOnlyPattern, drawnLines]);

  const drawCircle = () => {
    if (!ctxRef.current) return;
    const ctx = ctxRef.current;
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    // Create a simple gradient background
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, canvasSize / 2);
    gradient.addColorStop(0, '#f7fafc');  // Very light blue-gray
    gradient.addColorStop(1, '#edf2f7');  // Slightly darker blue-gray

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    if (!showOnlyPattern) {
      // Draw the main circle
      ctx.beginPath();
      ctx.strokeStyle = ruleLineColor;
      ctx.lineWidth = 2;
      ctx.arc(center, center, radius, 0, 2 * Math.PI);
      ctx.stroke();

      // Draw divisions and dots
      ctx.font = `${fontSize}px Arial`; // Set font size and family
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < divisions; i++) {
        const angle = (i * 360) / divisions;
        const radian = (angle * Math.PI) / 180;
        const dotX = center + radius * Math.cos(radian);
        const dotY = center + radius * Math.sin(radian);

        // Draw larger dot
        ctx.beginPath();
        ctx.fillStyle = ruleLineColor;
        ctx.arc(dotX, dotY, dotRadius, 0, 2 * Math.PI);
        ctx.fill();

        // Draw number
        const textX = center + (radius + 20) * Math.cos(radian);
        const textY = center + (radius + 20) * Math.sin(radian);
        ctx.fillStyle = ruleLineColor;
        ctx.fillText(i.toString(), textX, textY);
      }
    }

    if (showRuleLines) {
      drawRuleLines(ctx);
    }

    // Draw user-drawn lines
    drawnLines.forEach(line => {
      ctx.beginPath();
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.thickness;
      ctx.moveTo(line.start.x, line.start.y);
      ctx.lineTo(line.end.x, line.end.y);
      ctx.stroke();
    });
  };

  const drawRuleLines = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = ruleLineColor;
    rules.forEach(rule => {
      const [start, offset] = rule.split('+').map(n => parseInt(n.trim()));
      for (let i = 0; i < divisions; i++) {
        const startAngle = (i / divisions) * 2 * Math.PI;
        const endAngle = ((i + offset) % divisions / divisions) * 2 * Math.PI;

        const startX = center + radius * Math.cos(startAngle);
        const startY = center + radius * Math.sin(startAngle);
        const endX = center + radius * Math.cos(endAngle);
        const endY = center + radius * Math.sin(endAngle);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
    });
  };

  const snapToPoint = (x: number, y: number): Point => {
    let closestPoint = { x, y };
    let minDistance = Infinity;

    for (let i = 0; i < divisions; i++) {
      const angle = (i * 360) / divisions;
      const radian = (angle * Math.PI) / 180;
      const pointX = center + radius * Math.cos(radian);
      const pointY = center + radius * Math.sin(radian);

      const distance = Math.sqrt(Math.pow(x - pointX, 2) + Math.pow(y - pointY, 2));
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = { x: pointX, y: pointY };
      }
    }

    // Only snap if the closest point is within a certain distance (e.g., 20 pixels)
    return minDistance <= 20 ? closestPoint : { x, y };
  };

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (freeDrawing) {
      if (ctxRef.current) {
        ctxRef.current.beginPath();
        ctxRef.current.moveTo(x, y);
      }
    } else {
      setStartPoint(snapToPoint(x, y));
    }
    setIsDrawing(true);
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawingMode) return;
    const canvas = canvasRef.current;
    if (!canvas || !ctxRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (freeDrawing) {
      ctxRef.current.lineTo(x, y);
      ctxRef.current.stroke();
    } else {
      drawCircle(); // Redraw the base circle and existing lines
      ctxRef.current.beginPath();
      ctxRef.current.moveTo(startPoint!.x, startPoint!.y);
      ctxRef.current.lineTo(snapToPoint(x, y).x, snapToPoint(x, y).y);
      ctxRef.current.stroke();
    }
  };

  const stopDrawing = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if (!freeDrawing && startPoint) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const endPoint = snapToPoint(x, y);

      const newLine = { 
        start: startPoint, 
        end: endPoint, 
        color: drawingColor,
        thickness: lineThickness 
      };
      setDrawnLines([...drawnLines, newLine]);
    }
    setIsDrawing(false);
    setStartPoint(null);
    if (ctxRef.current) {
      ctxRef.current.beginPath(); // Start a new path after finishing the current one
    }
  };

  const handleAddRule = () => {
    const [start, end] = currentRule.split('+').map(n => parseInt(n.trim()));
    if (!isNaN(start) && !isNaN(end) && start >= 0 && end >= 0 && start < divisions && end < divisions) {
      const newRule = `${start}+${end}`;
      if (!rules.includes(newRule)) {
        setRules([...rules, newRule]);
        setCurrentRule('');
      }
    } else {
      alert('Invalid rule format. Please use "start+end" where both are valid division numbers.');
    }
  };

  const handleRemoveRule = (ruleToRemove: string) => {
    setRules(rules.filter(rule => rule !== ruleToRemove));
  };

  const handleUndo = () => {
    if (undoStack.length > 0) {
      const previousState = undoStack[undoStack.length - 1];
      setRedoStack([...redoStack, drawnLines]);
      setDrawnLines(previousState);
      setUndoStack(undoStack.slice(0, -1));
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const nextState = redoStack[redoStack.length - 1];
      setUndoStack([...undoStack, drawnLines]);
      setDrawnLines(nextState);
      setRedoStack(redoStack.slice(0, -1));
    }
  };

  const handleResetDrawing = () => {
    setUndoStack([...undoStack, drawnLines]);
    setDrawnLines([]);
    setRedoStack([]);
  };

  const handleResetAll = () => {
    setDivisions(12);
    setRules([]);
    setDrawingMode(false);
    setDrawingColor('#000000');
    setShowRuleLines(true);
    setShowOnlyPattern(false);
    handleResetDrawing();
  };

  const saveCanvasAsPNG = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = 'circle-divider-pattern.png';
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    }
  };

  const InstructionsModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-2xl">
        <h2 className="text-2xl font-bold mb-4">How to use the Circle Divider</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Adjust the number of divisions using the slider.</li>
          <li>Add rules by entering a number and clicking "Add Rule". The rule determines how points are connected.</li>
          <li>Toggle "Drawing Mode" to draw custom lines on the canvas.</li>
          <li>Use the color picker to change the drawing color.</li>
          <li>Click "Undo" or "Redo" to modify your custom drawings.</li>
          <li>"Reset Drawing" clears only your custom drawings.</li>
          <li>"Reset All" resets the entire canvas, including divisions and rules.</li>
          <li>Toggle "Show Rule Lines" to display or hide the rule-based connections.</li>
          <li>"Show Only Pattern" hides the circle and division markers.</li>
          <li>Click "Save as PNG" to download your creation as an image.</li>
        </ol>
        <button 
          onClick={() => setShowInstructions(false)} 
          className="mt-4 bg-blue-500 text-white p-2 rounded"
        >
          Got it!
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      {showInstructions && <InstructionsModal />}
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-6xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Wheel of Patterns
          </h1>
          <p className="text-xl text-gray-600">
            Create mesmerizing circular designs with ease
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <canvas
              ref={canvasRef}
              width={canvasSize}
              height={canvasSize}
              className="border border-gray-300 shadow-lg rounded-lg"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
          </div>
          <div className="flex-1 space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Drawing Mode</h2>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={drawingMode}
                  onChange={() => setDrawingMode(!drawingMode)}
                />
                <span>Enable Drawing Mode</span>
              </label>
            </div>
            
            {drawingMode ? (
              <div>
                <h2 className="text-xl font-semibold mb-2">Drawing Options</h2>
                <div className="flex items-center space-x-4 mb-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={freeDrawing}
                      onChange={() => setFreeDrawing(!freeDrawing)}
                    />
                    <span>Freehand Drawing</span>
                  </label>
                  <input
                    type="color"
                    value={drawingColor}
                    onChange={(e) => setDrawingColor(e.target.value)}
                    className="w-8 h-8"
                  />
                  <span>Color</span>
                </div>
                <div>
                  <label className="block">
                    Line Thickness: {lineThickness}px
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={lineThickness}
                      onChange={(e) => setLineThickness(parseInt(e.target.value))}
                      className="w-full mt-1"
                    />
                  </label>
                </div>
                <div className="mt-4 space-x-2">
                  <button onClick={handleUndo} className="bg-gray-300 p-2 rounded" disabled={undoStack.length === 0}>Undo</button>
                  <button onClick={handleRedo} className="bg-gray-300 p-2 rounded" disabled={redoStack.length === 0}>Redo</button>
                  <button onClick={handleResetDrawing} className="bg-yellow-500 text-white p-2 rounded">Reset Drawing</button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-xl font-semibold mb-2">Divisions</h2>
                  <input
                    type="range"
                    min="3"
                    max="36"
                    value={divisions}
                    onChange={(e) => setDivisions(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <p>Number of divisions: {divisions}</p>
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-2">Rules</h2>
                  <p className="text-sm text-gray-600 mb-2">
                    Rules define connections between all points. Format: start+steps
                  </p>
                  <button 
                    onClick={() => setShowRuleExplanation(!showRuleExplanation)}
                    className="text-blue-500 underline mb-2"
                  >
                    How do rules work?
                  </button>
                  {showRuleExplanation && <RuleExplanation />}
                  <div className="flex space-x-2 mb-2">
                    <input
                      type="text"
                      value={currentRule}
                      onChange={(e) => setCurrentRule(e.target.value)}
                      placeholder="e.g., 0+3"
                      className="border p-2 flex-grow"
                    />
                    <button onClick={handleAddRule} className="bg-blue-500 text-white p-2 rounded">
                      Add Rule
                    </button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {rules.map((rule, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <RuleVisualizer rule={rule} divisions={divisions} />
                        <button
                          onClick={() => handleRemoveRule(rule)}
                          className="bg-red-500 text-white p-1 rounded"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showRuleLines}
                  onChange={() => setShowRuleLines(!showRuleLines)}
                />
                <span>Show Rule Lines</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showOnlyPattern}
                  onChange={() => setShowOnlyPattern(!showOnlyPattern)}
                />
                <span>Show Only Pattern</span>
              </label>
            </div>
            <button onClick={handleResetAll} className="bg-red-500 text-white p-2 rounded w-full">Reset All</button>
            <button onClick={saveCanvasAsPNG} className="bg-green-500 text-white p-2 rounded w-full">Save as PNG</button>
            <button onClick={() => setShowInstructions(true)} className="bg-blue-500 text-white p-2 rounded w-full">
              Show Instructions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CircleDivider;