import pluginMeta from './Plugin.Meta';
import PluginComponent from './PluginComponent.vue';

import {
  PanelPlugin,
  LogSystemAdapter,
  EventSystemAdapter,
  DataSourceSystemAdapter,
  StorageSystemAdapter,
} from './../../DTCD-SDK';

export class VisualizationBarChart extends PanelPlugin {

  #id;
  #guid;
  #logSystem;
  #eventSystem;
  #storageSystem;
  #dataSourceSystem;
  #dataSourceSystemGUID;
  #vueComponent;

  #config = {
    title: '',
    targetName: 'План',
    colValue: 'value',
    colLineValue: 'lineValue',
    dataSource: '',
    showSerifLines: false,
    showRiskLine: false,
    showAxisX: true,
    showAxisY: false,
    horizontalMode: false,
    colorsByRange: [],
  };

  static getRegistrationMeta() {
    return pluginMeta;
  }

  constructor(guid, selector) {
    super();

    this.#id = `${pluginMeta.name}[${guid}]`;
    this.#guid = guid;
    this.#logSystem = new LogSystemAdapter('0.5.0', guid, pluginMeta.name);
    this.#eventSystem = new EventSystemAdapter('0.4.0', guid);
    this.#eventSystem.registerPluginInstance(this);
    this.#storageSystem = new StorageSystemAdapter('0.5.0');
    this.#dataSourceSystem = new DataSourceSystemAdapter('0.2.0');

    this.#dataSourceSystemGUID = this.getGUID(
      this.getSystem('DataSourceSystem', '0.2.0')
    );

    const { default: VueJS } = this.getDependence('Vue');

    const view = new VueJS({
      data: () => ({}),
      render: h => h(PluginComponent),
    }).$mount(selector);

    this.#vueComponent = view.$children[0];
    this.#logSystem.debug(`${this.#id} initialization complete`);
    this.#logSystem.info(`${this.#id} initialization complete`);
  }

  loadData(data) {
    this.#vueComponent.setDataset(data);
  }

  processDataSourceEvent(eventData) {
    const { dataSource, status } = eventData;
    const data = this.#storageSystem.session.getRecord(dataSource);
    this.#logSystem.debug(
      `${this.#id} process DataSourceStatusUpdate({ dataSource: ${dataSource}, status: ${status} })`
    );
    this.loadData(data);
  }

  setPluginConfig(config = {}) {
    this.#logSystem.debug(`Set new config to ${this.#id}`);
    this.#logSystem.info(`Set new config to ${this.#id}`);

    const configProps = Object.keys(this.#config);

    for (const [prop, value] of Object.entries(config)) {
      if (!configProps.includes(prop)) continue;

      if (this.#vueComponent.config.hasOwnProperty(prop)) {
        this.#vueComponent.config[prop] = value;
      }

      if (prop === 'dataSource' && value) {
        if (this.#config[prop]) {
          this.#logSystem.debug(
            `Unsubscribing ${this.#id} from DataSourceStatusUpdate({ dataSource: ${this.#config[prop]}, status: success })`
          );
          this.#eventSystem.unsubscribe(
            this.#dataSourceSystemGUID,
            'DataSourceStatusUpdate',
            this.#guid,
            'processDataSourceEvent',
            { dataSource: this.#config[prop], status: 'success' },
            );
          }

        const dsNewName = value;

        this.#logSystem.debug(
          `Subscribing ${this.#id} for DataSourceStatusUpdate({ dataSource: ${dsNewName}, status: success })`
        );

        this.#eventSystem.subscribe(
          this.#dataSourceSystemGUID,
          'DataSourceStatusUpdate',
          this.#guid,
          'processDataSourceEvent',
          { dataSource: dsNewName, status: 'success' },
        );

        const ds = this.#dataSourceSystem.getDataSource(dsNewName);

        if (ds && ds.status === 'success') {
          const data = this.#storageSystem.session.getRecord(dsNewName);
          this.loadData(data);
        }
      }

      this.#config[prop] = value;
      this.#logSystem.debug(`${this.#id} config prop value "${prop}" set to "${value}"`);
    }
  }

  getPluginConfig() {
    return { ...this.#config };
  }

  setFormSettings(config) {
    this.setPluginConfig(config);
  }

  getFormSettings() {
    return {
      fields: [
        {
          component: 'title',
          propValue: 'Общие настройки',
        },
        {
          component: 'title',
          propValue: 'Источник данных',
        },
        {
          component: 'datasource',
          propName: 'dataSource',
          attrs: {
            label: 'Выберите источник данных',
            placeholder: 'Выберите значение',
            required: true,
          },
        },
        {
          component: 'text',
          propName: 'title',
          attrs: {
            label: 'Заголовок',
          },
        },
        {
          component: 'text',
          propName: 'colValue',
          attrs: {
            label: 'Имя колонки со значениями',
            propValue: 'value',
          },
        },
        {
          component: 'text',
          propName: 'colLineValue',
          attrs: {
            label: 'Имя колонки cо значениями для линий',
            propValue: 'lineValue',
          },
        },
        {
          component: 'text',
          propName: 'targetName',
          attrs: {
            label: 'Значение поля "name" записи целевого показателя',
            propValue: 'targetName',
          },
        },
        {
          component: 'switch',
          propName: 'showSerifLines',
          attrs: {
            label: 'Включить линии-засечки на столбцах',
          },
        },
        {
          component: 'switch',
          propName: 'showRiskLine',
          attrs: {
            label: 'Включить режим сравнения показателей',
          },
        },
        {
          component: 'switch',
          propName: 'showAxisX',
          attrs: {
            label: 'Включить шкалу X',
          },
        },
        {
          component: 'switch',
          propName: 'showAxisY',
          attrs: {
            label: 'Включить шкалу Y',
          },
        },
        {
          component: 'switch',
          propName: 'horizontalMode',
          attrs: {
            label: 'Горизонтальный вид графика',
          },
        },
        {
          component: 'title',
          propValue: 'Настройка цветов',
        },
        {
          component: 'gauge-segments',
          propName: 'colorsByRange',
        },
      ],
    };
  }

}
