<template>
  <div class="barchart-container">
    <div class="title" v-text="title"/>
    <div ref="svgContainer" class="svg-container"/>
  </div>
</template>

<script>
export default {
  name: 'PluginComponent',
  data: (self) => ({
    logSystem: self.$root.logSystem,
    eventSystem: self.$root.eventSystem,
    /** Chart technical data. */
    svg: null,
    width: 0,
    height: 0,
    xScale: null,
    yScale: null,
    marginX: 16,
    marginY: 35,
    diffRectWidth: 0,
    targetBar: null,
    secondBars: [],
    sortedBars: [],
    targetBarColor: '#C6C6D4',
    secondBarColor: '#6290C3',
    isDataError: false,
    errorMessage: '',
    /** Chart user data. */
    title: '',
    targetName: 'План',
    colValue: 'value',
    colLineValue: 'lineValue',
    dataset: [],
  }),
  methods: {
    setTitle(text = '') {
      this.title = text;
      this.render();
    },

    setTargetName(name = '') {
      this.targetName = name;
      this.render();
    },

    setColValue(key="value"){
      this.colValue = key;
      this.render();
    },

    setColLineValue(key="lineValue"){
      this.colLineValue=key;
      this.render()
    },

    setError(text = '', show = false) {
      this.errorMessage = text;
      this.isDataError = show;
    },

    render() {
      const { isValid, error } = this.validateData();

      if (!isValid) {
        return this.setError(error, true);
      }

      this.$nextTick(() => {
        this.clearSvgContainer();
        this.prepareRenderData();
        this.createAxisX();
        this.createBars();
        this.createDiffRects();
      });
    },

    validateData() {
      const { dataset, targetName } = this;

      if (dataset.length <= 0) {
        return { isValid: false, error: 'Нет данных для построения' };
      }

      return { isValid: true, error: '' };
    },

    clearSvgContainer() {
      d3.select(this.$refs.svgContainer).select('svg').remove();
    },

    prepareRenderData() {
      const { svgContainer } = this.$refs;
      const { offsetWidth, offsetHeight } = svgContainer;

      this.targetBar = this.dataset.find(b => b.name === this.targetName);
      this.secondBars = this.dataset.filter(b => b.name !== this.targetName);
      this.sortedBars = [this.targetBar, ...this.secondBars];

      this.width = offsetWidth - this.marginX * 2;
      this.height = offsetHeight - this.marginY * 2;

      this.svg = d3.select(svgContainer)
        .append('svg')
        .attr('class', 'content')
        .append('g')
        .attr('transform', `translate(${this.marginX}, ${this.marginY})`);

      this.svg.append('rect')
        .attr('class', 'chart-back')
        .attr('x', 0)
        .attr('y', 0 - this.marginY)
        .attr('width', this.width)
        .attr('height', this.height + this.marginY)

      const paddingInner = 0.7;

      this.xScale = d3.scaleBand()
        .range([0, this.width])
        .domain(this.sortedBars.map(b => b.name))
        .paddingInner(paddingInner)
        .paddingOuter(0.35);

      const barValues = this.sortedBars.map(b => b[this.colValue]);
      const lineValues = this.sortedBars.map(b => b[this.colLineValue]);
      const [minY, maxY] = d3.extent([ ...barValues, ...lineValues]);

      this.yScale = d3.scaleLinear()
        .range([this.height, 0])
        .domain([minY - minY * 0.15, maxY]);

      this.diffRectWidth = this.xScale.step() * paddingInner;
    },

    createAxisX() {
      const axis = this.svg.append('g')
        .call(d3.axisBottom(this.xScale))
        .attr('transform', `translate(0, ${this.height})`);

      axis.selectAll('.tick line').each(function() {
        d3.select(this).remove();
      });

      axis.selectAll('.tick text').each(function() {
        d3.select(this).attr('class', 'x-axis-tick-caption');
      });

      const axisLine = d3.line()([[0, 0], [this.width, 0]]);

      axis.select('.domain').attr('class', 'x-axis-line').attr('d', axisLine);
    },

    createBars() {
      const barWidth = this.xScale.bandwidth();
      this.svg.selectAll('bar')
        .data(this.sortedBars)
        .enter()
        .append('rect')
        .attr('x', d => this.xScale(d.name))
        .attr('y', d => this.yScale(d[this.colValue]))
        .attr('fill', d => {
          const { targetName, targetBarColor, secondBarColor} = this;
          return d.name === targetName ? targetBarColor : secondBarColor;
        })
        .attr('height', d => this.height - this.yScale(d[this.colValue]))
        .attr('width', d => {
          const x = this.xScale(d.name);
          const y = this.yScale(d[this.colValue]);
          const textX = x + barWidth / 2;
          const textY = y - 10;
          const barLineY = this.yScale(d.lineValue);
          this.addLineToBar(x, barLineY, barWidth, d.lineValue);
          this.addTextElement(textX, textY, d[this.colValue], 'bar-value-caption');
          return barWidth;
        });
    },

    createDiffRects() {
      const planVal = this.targetBar[this.colValue];
      const planY = this.yScale(planVal);
      for (const bar of this.secondBars) {
        const { name, value } = bar;

        if (value === planVal) continue;

        const barX = this.xScale(name);
        const barY = this.yScale(value);

        const height = Math.abs(barY - planY);
        const diff = value - planVal;
        const x = barX - this.diffRectWidth;
        const y = barY < planY ? barY : barY - height;
        const fill = diff > 0 ? '#4CD9641F' : '#FF3B301F';

        this.svg.append('rect')
          .attr('x', x)
          .attr('y', y)
          .attr('width', this.diffRectWidth)
          .attr('height', height)
          .attr('fill', fill);

        const sign = diff > 0 ? '+' : '-';
        const className = diff > 0 ? 'plus' : 'minus';

        this.addTextElement(
          x + this.diffRectWidth / 2,
          y + height / 2,
          sign + Math.abs(diff),
          `diff-rect-caption ${className}`,
        );
      }
    },

    addLineToBar(x, y, width, text) {
      const line = d3.line()([[x - 5, y], [x + width + 5, y]]);
      this.svg.append('path').attr('class', 'risk-line').attr('d', line);
      this.addTextElement(
        x + width / 2,
        y + 20,
        text,
        'risk-line-caption',
      );
    },

    addTextElement(x, y, text, className) {
      const el = this.svg.append('text').attr('class', className)
      el.attr('x', x).attr('y', y).text(text);
    },
  },
};
</script>

<style lang="sass">
@import ./styles/component
</style>
