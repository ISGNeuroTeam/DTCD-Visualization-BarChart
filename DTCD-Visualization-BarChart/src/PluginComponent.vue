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
  }),
  mounted() {
    this.chart = new BarChartLib(this.$refs.svgContainer);
    this.chart.onClickBarplot = this.$root.publishEventClicked;
    this.render();
    this.$root.$on('resize', this.onResize)
  },
  computed: {
    config() {
      return this.$root.config;
    },
    dataset() {
      return this.$root.dataset;
    },
  },
  watch: {
    dataset() {
      this.render();
    },
    config: {
      deep: true,
      handler() {
        this.$nextTick(() => {
          this.render();
        })
      },
    }
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
      this.chart.setData(this.dataset);
      this.chart.render();
    },

    validateData() {
      const { dataset } = this;

      const {
        targetName,
        xAxis,
        colValue,
        colLineValue,
        showSerifLines,
      } = this.config;
      const showRiskLine = targetName !== '';

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

      if (showRiskLine && !dataset.find(b => `${b[xAxis]}` === targetName)) {
        return { isValid: false, error: `Отсутвует столбец со значением "${targetName}"` };
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
    line-height: 1.4
    padding: 10px

  .svg-container
    flex-grow: 1
    padding: 10px
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
        stroke-width: 3

      .risk-line-caption
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
