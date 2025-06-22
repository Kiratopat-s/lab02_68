// Advanced Calculus Calculator JavaScript
class CalculusCalculator {
  constructor() {
    this.history = [];
    this.currentOperation = null;
    this.init();
  }

  init() {
    // Load history from localStorage
    this.loadHistory();

    // Set up event listeners
    this.setupEventListeners();

    // Initialize MathJax rendering
    this.initializeMathJax();
  }

  setupEventListeners() {
    // Enter key support
    document
      .getElementById("functionInput")
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.performLastOperation();
        }
      });

    // Real-time validation
    document.getElementById("functionInput").addEventListener("input", (e) => {
      this.validateFunction(e.target.value);
    });
  }

  initializeMathJax() {
    if (window.MathJax) {
      MathJax.typesetPromise().catch((err) =>
        console.log("MathJax error:", err)
      );
    }
  }

  validateFunction(expression) {
    try {
      // Basic validation using math.js
      const parsed = math.parse(expression);
      return true;
    } catch (error) {
      return false;
    }
  }

  async performOperation(operation) {
    this.currentOperation = operation;
    const functionInput = document.getElementById("functionInput").value.trim();
    const variable =
      document.getElementById("variableInput").value.trim() || "x";

    if (!functionInput) {
      this.showError("Please enter a function");
      return;
    }

    this.showLoading(true);

    try {
      let result;
      let steps = [];
      let additionalInfo = "";

      if (operation === "derivative") {
        result = await this.calculateDerivative(functionInput, variable);
        steps = this.getDerivativeSteps(functionInput, variable);
        additionalInfo = this.getDerivativeInfo(functionInput, variable);
      } else if (operation === "integral") {
        result = await this.calculateIntegral(functionInput, variable);
        steps = this.getIntegralSteps(functionInput, variable);
        additionalInfo = this.getIntegralInfo(functionInput, variable);
      }

      this.displayResult(result, operation, functionInput, variable);
      this.displaySteps(steps);
      this.displayAdditionalInfo(additionalInfo);
      this.addToHistory(functionInput, operation, result, variable);
    } catch (error) {
      this.showError("Error calculating: " + error.message);
    } finally {
      this.showLoading(false);
    }
  }

  async calculateDerivative(expression, variable) {
    try {
      // Convert common mathematical notation
      const normalizedExpression = this.normalizeExpression(expression);

      // Use math.js to calculate derivative
      const derivative = math.derivative(normalizedExpression, variable);
      return derivative.toString();
    } catch (error) {
      // Fallback: symbolic differentiation rules
      return this.symbolicDerivative(expression, variable);
    }
  }

  async calculateIntegral(expression, variable) {
    try {
      const normalizedExpression = this.normalizeExpression(expression);

      // Check if definite integral
      const lowerLimit = document.getElementById("lowerLimit").value.trim();
      const upperLimit = document.getElementById("upperLimit").value.trim();

      if (lowerLimit && upperLimit) {
        // Definite integral
        const result = this.calculateDefiniteIntegral(
          normalizedExpression,
          variable,
          lowerLimit,
          upperLimit
        );
        return `${result} (from ${lowerLimit} to ${upperLimit})`;
      } else {
        // Indefinite integral
        return this.symbolicIntegral(expression, variable) + " + C";
      }
    } catch (error) {
      throw new Error("Integration calculation failed: " + error.message);
    }
  }

  normalizeExpression(expression) {
    // Convert common mathematical notation to math.js format
    return expression
      .replace(/\^/g, "^")
      .replace(/ln\(/g, "log(")
      .replace(/log\(/g, "log10(")
      .replace(/e\^/g, "exp(")
      .replace(/√/g, "sqrt")
      .replace(/π/g, "pi")
      .replace(/∞/g, "Infinity");
  }

  symbolicDerivative(expression, variable) {
    // Basic symbolic differentiation rules
    const derivatives = {
      x: "1",
      "x^2": "2*x",
      "x^3": "3*x^2",
      "x^n": "n*x^(n-1)",
      "sin(x)": "cos(x)",
      "cos(x)": "-sin(x)",
      "tan(x)": "sec(x)^2",
      "e^x": "e^x",
      "ln(x)": "1/x",
      "log(x)": "1/(x*ln(10))",
    };

    // Try to match common patterns
    for (const [pattern, derivative] of Object.entries(derivatives)) {
      if (expression === pattern.replace(/x/g, variable)) {
        return derivative.replace(/x/g, variable);
      }
    }

    // Fallback for power rule
    const powerMatch = expression.match(new RegExp(`${variable}\\^(\\d+)`));
    if (powerMatch) {
      const power = parseInt(powerMatch[1]);
      if (power === 1) return "1";
      return `${power}*${variable}^${power - 1}`;
    }

    // Constant rule
    if (!expression.includes(variable)) {
      return "0";
    }

    return `d/d${variable}(${expression})`;
  }

  symbolicIntegral(expression, variable) {
    // Basic symbolic integration rules
    const integrals = {
      1: "x",
      x: "x^2/2",
      "x^2": "x^3/3",
      "x^3": "x^4/4",
      "1/x": "ln(|x|)",
      "sin(x)": "-cos(x)",
      "cos(x)": "sin(x)",
      "e^x": "e^x",
      "tan(x)": "-ln(|cos(x)|)",
    };

    // Try to match common patterns
    for (const [pattern, integral] of Object.entries(integrals)) {
      if (expression === pattern.replace(/x/g, variable)) {
        return integral.replace(/x/g, variable);
      }
    }

    // Power rule for integration
    const powerMatch = expression.match(new RegExp(`${variable}\\^(\\d+)`));
    if (powerMatch) {
      const power = parseInt(powerMatch[1]);
      const newPower = power + 1;
      return `${variable}^${newPower}/${newPower}`;
    }

    // Constant rule
    if (!expression.includes(variable)) {
      return `${expression}*${variable}`;
    }

    return `∫(${expression})d${variable}`;
  }

  calculateDefiniteIntegral(expression, variable, lower, upper) {
    try {
      // Use numerical integration for definite integrals
      const f = math.compile(expression);
      const scope = {};

      // Simpson's rule for numerical integration
      const n = 1000; // number of subdivisions
      const h = (parseFloat(upper) - parseFloat(lower)) / n;
      let sum = 0;

      for (let i = 0; i <= n; i++) {
        const x = parseFloat(lower) + i * h;
        scope[variable] = x;
        const fx = f.evaluate(scope);

        if (i === 0 || i === n) {
          sum += fx;
        } else if (i % 2 === 1) {
          sum += 4 * fx;
        } else {
          sum += 2 * fx;
        }
      }

      return ((h / 3) * sum).toFixed(6);
    } catch (error) {
      throw new Error("Numerical integration failed");
    }
  }

  getDerivativeSteps(expression, variable) {
    const steps = [
      `Given function: f(${variable}) = ${expression}`,
      `Find: f'(${variable}) = d/d${variable}[${expression}]`,
      `Apply differentiation rules...`,
      `Result: f'(${variable}) = ${this.symbolicDerivative(
        expression,
        variable
      )}`,
    ];
    return steps;
  }

  getIntegralSteps(expression, variable) {
    const steps = [
      `Given function: f(${variable}) = ${expression}`,
      `Find: ∫f(${variable})d${variable} = ∫${expression}d${variable}`,
      `Apply integration rules...`,
      `Result: ∫${expression}d${variable} = ${this.symbolicIntegral(
        expression,
        variable
      )} + C`,
    ];
    return steps;
  }

  getDerivativeInfo(expression, variable) {
    return `The derivative represents the rate of change of the function with respect to ${variable}. 
                Geometrically, it gives the slope of the tangent line to the curve at any point.`;
  }

  getIntegralInfo(expression, variable) {
    return `The integral represents the area under the curve. For indefinite integrals, 
                we add a constant of integration (+C). For definite integrals, we get a specific numerical value.`;
  }

  displayResult(result, operation, originalFunction, variable) {
    const container = document.getElementById("resultContainer");
    const operationSymbol = operation === "derivative" ? "f'(x)" : "∫f(x)dx";
    const operationName =
      operation === "derivative" ? "Derivative" : "Integral";

    container.innerHTML = `
            <div class="bg-white/10 rounded-lg p-6 border border-white/20 fade-in">
                <h3 class="text-lg font-semibold text-white mb-4">${operationName} Result:</h3>
                <div class="bg-black/20 rounded-lg p-4 mb-4">
                    <p class="text-white/80 text-sm mb-2">Original function:</p>
                    <div class="text-white text-xl font-mono">f(${variable}) = ${originalFunction}</div>
                </div>
                <div class="bg-black/20 rounded-lg p-4">
                    <p class="text-white/80 text-sm mb-2">${operationName}:</p>
                    <div class="text-white text-xl font-mono break-all">${operationSymbol} = ${result}</div>
                </div>
            </div>
        `;

    // Re-render MathJax for the new content
    if (window.MathJax) {
      MathJax.typesetPromise([container]).catch((err) =>
        console.log("MathJax error:", err)
      );
    }
  }

  displaySteps(steps) {
    const container = document.getElementById("stepsContainer");
    const stepsList = document.getElementById("stepsList");

    if (steps && steps.length > 0) {
      stepsList.innerHTML = steps
        .map(
          (step, index) => `
                <div class="flex items-start space-x-3 p-3 bg-white/5 rounded-lg">
                    <span class="flex-shrink-0 w-6 h-6 bg-blue-500 text-white text-sm rounded-full flex items-center justify-center font-bold">
                        ${index + 1}
                    </span>
                    <p class="text-white/90 flex-1">${step}</p>
                </div>
            `
        )
        .join("");

      container.classList.remove("hidden");
    } else {
      container.classList.add("hidden");
    }
  }

  displayAdditionalInfo(info) {
    const container = document.getElementById("additionalInfo");
    const infoContent = document.getElementById("infoContent");

    if (info) {
      infoContent.innerHTML = `<p>${info}</p>`;
      container.classList.remove("hidden");
    } else {
      container.classList.add("hidden");
    }
  }

  addToHistory(expression, operation, result, variable) {
    const historyItem = {
      id: Date.now(),
      expression,
      operation,
      result,
      variable,
      timestamp: new Date().toLocaleString(),
    };

    this.history.unshift(historyItem);
    this.saveHistory();
    this.displayHistory();
  }

  displayHistory() {
    const container = document.getElementById("historyContainer");

    if (this.history.length === 0) {
      container.innerHTML = `
                <div class="text-center text-white/60 py-8">
                    <i class="fas fa-clock text-3xl mb-4"></i>
                    <p>No calculations yet</p>
                </div>
            `;
      return;
    }

    container.innerHTML = this.history
      .map(
        (item) => `
            <div class="bg-white/10 rounded-lg p-4 border border-white/20 hover:bg-white/15 transition-colors">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex-1">
                        <p class="text-white font-mono text-sm">
                            ${
                              item.operation === "derivative"
                                ? "Derivative"
                                : "Integral"
                            } of: ${item.expression}
                        </p>
                        <p class="text-white/80 font-mono text-sm mt-1">
                            Result: ${item.result}
                        </p>
                    </div>
                    <div class="text-right ml-4">
                        <p class="text-white/60 text-xs">${item.timestamp}</p>
                        <button 
                            onclick="calculator.replayCalculation(${item.id})" 
                            class="mt-1 text-blue-400 hover:text-blue-300 text-xs"
                        >
                            <i class="fas fa-redo mr-1"></i>Replay
                        </button>
                    </div>
                </div>
            </div>
        `
      )
      .join("");
  }

  replayCalculation(id) {
    const item = this.history.find((h) => h.id === id);
    if (item) {
      document.getElementById("functionInput").value = item.expression;
      document.getElementById("variableInput").value = item.variable;
      this.performOperation(item.operation);
    }
  }

  clearHistory() {
    if (confirm("Are you sure you want to clear the calculation history?")) {
      this.history = [];
      this.saveHistory();
      this.displayHistory();
    }
  }

  saveHistory() {
    localStorage.setItem("calculusHistory", JSON.stringify(this.history));
  }

  loadHistory() {
    const saved = localStorage.getItem("calculusHistory");
    if (saved) {
      this.history = JSON.parse(saved);
      this.displayHistory();
    }
  }

  showLoading(show) {
    const loading = document.getElementById("loadingIndicator");
    const results = document.getElementById("resultContainer");

    if (show) {
      loading.classList.remove("hidden");
      results.style.opacity = "0.5";
    } else {
      loading.classList.add("hidden");
      results.style.opacity = "1";
    }
  }

  showError(message) {
    const container = document.getElementById("resultContainer");
    container.innerHTML = `
            <div class="bg-red-500/20 border border-red-500/50 rounded-lg p-6 text-center">
                <i class="fas fa-exclamation-triangle text-red-400 text-3xl mb-4"></i>
                <h3 class="text-red-400 font-semibold mb-2">Error</h3>
                <p class="text-white/90">${message}</p>
            </div>
        `;
  }

  performLastOperation() {
    if (this.currentOperation) {
      this.performOperation(this.currentOperation);
    } else {
      this.performOperation("derivative");
    }
  }
}

// Global functions for HTML event handlers
function performOperation(operation) {
  calculator.performOperation(operation);
}

function toggleAdvanced() {
  const options = document.getElementById("advancedOptions");
  const text = document.getElementById("advancedToggleText");
  const chevron = document.getElementById("advancedChevron");
  const integrationLimits = document.getElementById("integrationLimits");
  const derivativeOrder = document.getElementById("derivativeOrder");

  if (options.classList.contains("hidden")) {
    options.classList.remove("hidden");
    text.textContent = "Hide Advanced Options";
    chevron.classList.add("rotate-180");

    // Show relevant options based on last operation
    if (calculator.currentOperation === "integral") {
      integrationLimits.classList.remove("hidden");
      derivativeOrder.classList.add("hidden");
    } else {
      derivativeOrder.classList.remove("hidden");
      integrationLimits.classList.add("hidden");
    }
  } else {
    options.classList.add("hidden");
    text.textContent = "Show Advanced Options";
    chevron.classList.remove("rotate-180");
  }
}

function setFunction(func) {
  document.getElementById("functionInput").value = func;
}

function clearHistory() {
  calculator.clearHistory();
}

// Initialize calculator when page loads
let calculator;
document.addEventListener("DOMContentLoaded", () => {
  calculator = new CalculusCalculator();
});
