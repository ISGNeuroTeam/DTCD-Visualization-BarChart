export class BarChartLib {

  #svg = null;
  #svgContainer = null;
  #chartArea = null;
  #leftAxisWidth = 0;
  #yScale = null;
  #xScale = null;
  #width = 200;
  #height = 200;
  #diffRectWidth = null;

  dataset = [];
  secondBars = [];
  sortedBars = [];
  targetBarColor = 'var(--border)';
  secondBarColor = 'var(--aero)';
  onClickBarplot;

  #config = {
    marginX: 16,
    marginY: 16,
    paddingInner: .7,
    paddingOuter: .35,
    targetName: null,
    colValue: 'value',
    colLineValue: 'lineValue',
    showSerifLines: false,
    showRiskLine: false,
    showAxisX: true,
    showAxisY: false,
    horizontalMode: false,
    roundValueTo: null,
    colorsByRange: [],
  };

  constructor($svgContainer) {
    this.#svgContainer = $svgContainer;
    this.createTooltip();
  }

  setConfig(obj) {
    Object.keys(this.#config).forEach((propName) => {
      if (obj.hasOwnProperty(propName)) {
        this.#config[propName] = obj[propName];
      }
    })
  }

  clear() {
    d3.select(this.#svgContainer)
      .select('svg')
      .remove();
  }

  prepareRenderData() {
    const {
      offsetWidth,
      offsetHeight,
    } = this.#svgContainer;

    const {
      horizontalMode,
      targetName,
      marginX,
      marginY,
      paddingInner,
      paddingOuter,
      colValue,
      colLineValue,
      showAxisY,
      showAxisX,
      showSerifLines,
    } = this.#config;

    this.targetBar = this.dataset.find(b => b.name === targetName);
    this.secondBars = this.dataset.filter(b => b.name !== targetName);
    this.sortedBars = [];
    if (this.targetBar) {
      this.sortedBars.push(this.targetBar)
    }
    this.sortedBars.push(...this.secondBars);

    this.#width = offsetWidth - marginX * 2;
    this.#height = offsetHeight - marginY * 2;

    if (showAxisX || showSerifLines) {
      this.#height -= 16;
    }

    if (horizontalMode) {
      this.#width -= 50
    }

    this.#svg = d3.select(this.#svgContainer)
      .append('svg')
      .attr('class', 'content')
      .append('g')
      .attr('transform', `translate(${marginX}, ${marginY})`);

    const barValues = this.sortedBars.map(b => b[colValue]);
    const lineValues = this.sortedBars.map(b => b[colLineValue]);
    const maxY = d3.max([...barValues, ...lineValues]);

    const valueDomain = [0, maxY];
    const groupDomain = this.sortedBars.map(b => b.name);

    if (showAxisY) {
      const axis = this.#svg.append('g')
        .call(d3.axisLeft(d3.scaleBand().domain(horizontalMode ? groupDomain : valueDomain)));
      this.#leftAxisWidth = axis.node().getBBox().width + 8;
      axis.remove();
    } else {
      this.#leftAxisWidth = 0;
    }

    const xRange = [0, this.#width - this.#leftAxisWidth];
    const yRange = [this.#height, 0];

    if (horizontalMode) {
      this.#xScale = d3.scaleLinear()
        .range(xRange)
        .domain(valueDomain)
        .nice();

      this.#yScale = d3.scaleBand()
        .range(yRange)
        .domain(groupDomain)
        .paddingInner(paddingInner)
        .paddingOuter(paddingOuter);

      this.#diffRectWidth = this.#yScale.step() * paddingInner;

    } else {
      this.#yScale = d3.scaleLinear()
        .range(yRange)
        .domain(valueDomain)
        .nice();

      this.#xScale = d3.scaleBand()
        .range(xRange)
        .domain(groupDomain)
        .paddingInner(paddingInner)
        .paddingOuter(paddingOuter);

      this.#diffRectWidth = this.#xScale.step() * paddingInner;
    }
    return true;
  }

  resize() {
    if (this.#chartArea) {
      this.clear();
    }
    this.render();
  }

  render() {
    if (!this.prepareRenderData()) {
      return;
    }

    const {
      showAxisX,
      showAxisY,
      showRiskLine,
      horizontalMode,
    } = this.#config;

    showAxisY && this.createAxisY();
    showAxisX && this.createAxisX();

    this.#chartArea = this.#svg.append('g')
      .attr('class', 'chart-area')
      .attr('transform', `translate(${this.#leftAxisWidth}, 0)`);

    if (showRiskLine) {
      if (horizontalMode) {
        this.createDiffRectsForHorizontal();
      } else {
        this.createDiffRects();
      }
    }

    this.createBars();
  }

  createAxisY() {
    const {
      horizontalMode,
    } = this.#config;

    const axis = this.#svg.append('g')
      .call(d3.axisLeft(this.#yScale))
      .attr('transform', `translate(${this.#leftAxisWidth}, 0)`);

    axis.selectAll('.domain')
      .remove();
    axis.selectAll('.tick text')
      .attr('class', 'y-axis-tick-caption');

    if (horizontalMode) {
      axis.selectAll('.tick line')
        .remove();
    } else {
      axis.selectAll('.tick line')
        .attr('x2', this.#width - this.#leftAxisWidth)
        .attr('class', 'y-axis-line');
    }
  }

  createAxisX() {
    const {
      horizontalMode,
    } = this.#config;

    const axis = this.#svg.append('g')
      .call(d3.axisBottom(this.#xScale))
      .attr('transform', `translate(${this.#leftAxisWidth}, ${this.#height})`);

    axis.selectAll('.tick text')
      .attr('class', 'x-axis-tick-caption');

    if (horizontalMode) {
      axis.selectAll('.domain')
        .remove();
      axis.selectAll('.tick line')
        .attr('y2', -this.#height)
        .attr('class', 'x-axis-line');
    } else {
      axis.selectAll('.tick line')
        .remove();

      axis.select('.domain')
        .attr('class', 'x-axis-line')
        .attr('d', d3.line()([[0, 0], [this.#width - this.#leftAxisWidth, 0]]));

    }
  }

  setData(data) {
    this.dataset = data;
  }

  createDiffRects() {
    const {
      colValue,
    } = this.#config;

    const planVal = this.targetBar[colValue];
    const planY = this.#yScale(planVal);
    for (const bar of this.secondBars) {
      const {name} = bar;
      const value = bar[colValue];

      if (value === planVal) continue;

      const barX = this.#xScale(name);
      const barY = this.#yScale(value);

      const height = Math.abs(barY - planY);
      const diff = value - planVal;
      const x = barX - this.#diffRectWidth;
      const y = barY < planY ? barY : barY - height;
      const fill = diff > 0 ? 'var(--success_12)' : 'var(--danger_12)';

      this.#chartArea.append('rect')
        .attr('class', 'diff-rect')
        .attr('x', x)
        .attr('y', y)
        .attr('width', this.#diffRectWidth)
        .attr('height', height)
        .attr('fill', fill)
        .on('mouseover', (event, d) => {
          this.tooltip
            .text(`diff: ${sign + Math.abs(diff)}`)
            .style('opacity', 1);
          this.setTooltipPosition(event);
        })
        .on('mousemove', (event) => this.setTooltipPosition(event))
        .on('mouseout', () => this.tooltip.style('opacity', 0));

      const sign = diff > 0 ? '+' : '-';
      const className = diff > 0 ? 'plus' : 'minus';

      this.addTextElement(
        x + this.#diffRectWidth / 2,
        y + height / 2,
        this.roundValue(sign + Math.abs(diff)),
        `diff-rect-caption ${className}`,
      );
    }
  }

  createDiffRectsForHorizontal() {
    const {
      colValue,
    } = this.#config;

    const barHeight = this.#yScale.bandwidth();
    const planVal = this.targetBar[colValue];
    const planX = this.#xScale(planVal);
    for (const bar of this.secondBars) {
      const {name} = bar;
      const value = bar[colValue];

      if (value === planVal) continue;

      const barX = this.#xScale(value);
      const barY = this.#yScale(name);

      const width = Math.abs(barX - planX);
      const diff = value - planVal;
      const x = (barX < planX) ? barX : barX - width;
      const y = barY + barHeight;
      const fill = diff > 0 ? 'var(--success_12)' : 'var(--danger_12)';

      this.#chartArea.append('rect')
        .attr('class', 'diff-rect')
        .attr('x', x)
        .attr('y', y)
        .attr('width', width)
        .attr('height', this.#diffRectWidth)
        .attr('fill', fill)
        .on('mouseover', (event, d) => {
          this.tooltip
            .text(`diff: ${sign + Math.abs(diff)}`)
            .style('opacity', 1);
          this.setTooltipPosition(event);
        })
        .on('mousemove', (event) => this.setTooltipPosition(event))
        .on('mouseout', () => this.tooltip.style('opacity', 0));

      const sign = diff > 0 ? '+' : '-';
      const className = diff > 0 ? 'plus' : 'minus';

      this.addTextElement(
        x + width / 2,
        y + this.#diffRectWidth / 2,
        this.roundValue(sign + Math.abs(diff)),
        `diff-rect-caption ${className}`,
      );
    }
  }

  addLineToBar(x, y, width, text) {
    const {
      horizontalMode,
    } = this.#config;

    this.#chartArea
      .append('path')
      .attr('class', 'risk-line')
      .attr('d', horizontalMode
        ? d3.line()([[x, y - 5], [x, y + width + 5]])
        : d3.line()([[x - 5, y], [x + width + 5, y]])
      )
      .on('mouseover', (event, d) => {
        this.tooltip
          .text(`line: ${text}`)
          .style('opacity', 1);
        this.setTooltipPosition(event);
      })
      .on('mousemove', (event) => this.setTooltipPosition(event))
      .on('mouseout', () => this.tooltip.style('opacity', 0));

    const textYOffset = (!horizontalMode && y + 30 > this.#height) ? -10 : 20;

    this.addTextElement(
      x + (horizontalMode ? 10 : width / 2),
      y + (horizontalMode ? width / 2 + 5 : textYOffset),
      this.roundValue(text),
      `risk-line-caption ${horizontalMode ? 'hor' : ''}`,
    );
  }

  addTextElement(x, y, text, className) {
    const el = this.#chartArea
      .append('text')
      .style('pointer-events', 'none')
      .attr('class', className);

    el.attr('x', x).attr('y', y).text(text);
  }

  createBars() {
    const {
      horizontalMode,
      showSerifLines,
      colValue,
      colLineValue,
      colorsByRange,
    } = this.#config;

    const barWidth = horizontalMode ? this.#yScale.bandwidth() : this.#xScale.bandwidth();

    this.#chartArea.selectAll('bar')
      .data(this.sortedBars)
      .enter()
      .append('rect')
      .attr('class', 'barplot')
      .attr('x', d => this.#xScale(horizontalMode ? 0 : d.name))
      .attr('y', d => this.#yScale(horizontalMode ? d.name : d[colValue]))
      .attr('fill', d => {
        const {
          targetName,
          targetBarColor,
          secondBarColor,
        } = this;

        if (colorsByRange.length) {
          return this.getColorForValue(d[colValue]) || secondBarColor;
        }
        return d.name === targetName ? targetBarColor : secondBarColor;
      })
      .attr('height', (d) => horizontalMode ? barWidth : this.#height - this.#yScale(d[colValue]))
      .attr('width', d => horizontalMode ? this.#xScale(d[colValue]) : barWidth)
      .each((d) => {

        const x = horizontalMode ? this.#xScale(d[colValue]) : this.#xScale(d.name);
        let y = horizontalMode ? this.#yScale(d.name) : this.#yScale(d[colValue]);
        let textX = x;
        let textY = y;
        if (horizontalMode) {
          textX += 10;
          textY += barWidth / 2 + 5;
        } else {
          textX += barWidth / 2;
          textY -= 5;
        }

        if (showSerifLines) {
          const barLineY = horizontalMode ? y : this.#yScale(d[colLineValue]);
          const barLineX = horizontalMode ? this.#xScale(d[colLineValue]) : x;
          this.addLineToBar(barLineX, barLineY, barWidth, d[colLineValue]);
        }
        this.addTextElement(
          textX,
          textY,
          this.roundValue(d[colValue]),
          `bar-value-caption ${horizontalMode ? 'hor' : ''}`
        );

      })
      .on('mouseover', (event, d) => {
        this.tooltip
          .text(`${colValue}: ${d[colValue]}`)
          .style('opacity', 1);
        this.setTooltipPosition(event);
      })
      .on('mousemove', (event) => this.setTooltipPosition(event))
      .on('mouseout', () => this.tooltip.style('opacity', 0))
      .on('click', (event, d) => {
        if (typeof this.onClickBarplot === 'function') {
          this.onClickBarplot(d);
        }
      });
  }

  setTooltipPosition(event) {
    const box = this.tooltip.node().getBoundingClientRect();
    this.tooltip
      .style("left", (event.pageX - box.width / 2) + "px")
      .style("top", (event.pageY - box.height - 16) + "px")
  }

  createTooltip() {
    const styles = [
      ['opacity', 0],
      ['position', 'absolute'],
      ['padding', '4px 8px'],
      ['background', 'var(--background_main)'],
      ['color', 'var(--text_main)'],
      ['border', '1px solid var(--border)'],
      ['border-radius', '3px'],
      ['font-family', 'Proxima Nova'],
    ];
    this.tooltip = d3.select('#page').append('div')
      .attr('class', 'tooltip');
    styles.forEach(([prop, val]) => this.tooltip.style(prop, val));
  }

  roundValue(value) {
    const {
      roundValueTo,
    } = this.#config;
    const floatValue = Number.parseFloat(value);
    if (!isNaN(floatValue)) {
      return floatValue.toFixed(+roundValueTo)
    }
    return value;
  }

  getColorForValue(val) {
    const range = this.#config.colorsByRange
      .find(({range}) => val >= range[0] && val <= range[1]);
    if (range) {
      return range.color;
    }
    return null;
  }
}
