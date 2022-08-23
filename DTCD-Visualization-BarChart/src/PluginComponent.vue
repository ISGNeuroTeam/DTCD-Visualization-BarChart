<template>
  <div class="VisualizationBarChart">
    <div v-if="isDataError" class="DataError">
      <span class="FontIcon name_infoCircleOutline Icon"></span>
      {{ errorMessage }}
    </div>
    <div
      v-if="config.title"
      class="title"
      v-text="config.title"/>
    <div ref="svgContainer" class="svg-container"/>
  </div>
</template>

<script>
import {BarChartLib} from "./libs/BarChartLib";

export default {
  name: 'PluginComponent',
  data: ({$root}) => ({
    guid: $root.guid,
    /** Chart technical data. */
    isDataError: false,
    errorMessage: '',
    /** Chart user data. */
    dataset: [],
    config: {
      title: '',
      targetName: 'План',
      colValue: 'value',
      colLineValue: 'lineValue',
      leftAxisWidth: 0,
      showSerifLines: false,
      showRiskLine: false,
      showAxisX: true,
      showAxisY: false,
      horizontalMode: false,
      colorsByRange: [],
    },
  }),
  mounted() {
    this.chart = new BarChartLib(this.$refs.svgContainer);
    this.render();
    this.resizeObserver = new ResizeObserver(this.onResize)
    this.resizeObserver.observe(this.$el)
  },
  beforeDestroy () {
    this.resizeObserver.unobserve(this.$el)
  },
  methods: {
    onResize() {
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
      }
      this.resizeTimeout = setTimeout(() => {
        this.chart.resize();
        this.resizeTimeout = null;
      }, 50)
    },

    setDataset(data = []) {
      this.dataset = data;
      this.chart.setData(data);
      this.render();
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

      this.setError('', false);

      this.chart.clear();
      this.chart.setConfig(this.config);
      this.chart.render();
    },

    validateData() {
      const { dataset } = this;

      const {
        targetName,
        colValue,
        colLineValue,
        showRiskLine,
        showSerifLines,
      } = this.config;

      if (dataset.length <= 0) {
        return { isValid: false, error: 'Нет данных для построения' };
      }

      const dsCols = Object.keys(dataset[0]);

      if (!dsCols.includes(colValue)) {
        return { isValid: false, error: `Отсутствует столбец данных ${colValue}` };
      }

      if (showSerifLines && !dsCols.includes(colLineValue)) {
        return { isValid: false, error: `Отсутствует столбец данных ${colLineValue}` };
      }

      if (showRiskLine && !dataset.find(b => b.name === targetName)) {
        return { isValid: false, error: `Отсутвует столбец данных "name" со значением "${targetName}"` };
      }

      return { isValid: true, error: '' };
    },

  },
};
</script>

<style lang="sass" scoped>
.VisualizationBarChart::v-deep
  width: 100%
  height: 100%
  display: flex
  flex-direction: column
  font-family: 'Proxima Nova', serif
  position: relative

  .DataError
    position: absolute
    display: flex
    width: 100%
    height: 100%
    align-items: center
    justify-content: center
    flex-direction: column
    padding: 20px
    text-align: center
    color: var(--text_secondary)
    background-color: var(--background_main)

    .Icon
      color: var(--border_secondary)
      font-size: 100px
      margin-bottom: 8px

  .title
    color: var(--text_main)
    font-size: 18px
    font-weight: 700
    line-height: 25px
    padding: 10px 16px

  .svg-container
    flex-grow: 1
    overflow: hidden

    .content
      width: 100%
      height: 100%

      .chart-back
        fill: var(--border_12)

      .x-axis-tick-caption,
      .y-axis-tick-caption
        fill: var(--text_main)
        font-size: 15px
        font-weight: 400

      .x-axis-line,
      .y-axis-line
        stroke: var(--border)
        stroke-width: .5

      .risk-line
        stroke: var(--pink)
        stroke-width: 3

      .risk-line-caption
        fill: var(--pink)
        font-weight: 600
        text-anchor: middle
        &.hor
          text-anchor: start

      .bar-value-caption
        fill: var(--text_main)
        font-weight: 600
        text-anchor: middle
        &.hor
          text-anchor: start

      .diff-rect-caption
        font-weight: 700
        text-anchor: middle
        alignment-baseline: central

        &.plus
          fill: var(--success)

        &.minus
          fill: var(--danger)
</style>
