import pluginMeta from './Plugin.Meta';
import PluginComponent from './PluginComponent.vue';

import {
  PanelPlugin,
  LogSystemAdapter,
  EventSystemAdapter,
  DataSourceSystemAdapter,
  StorageSystemAdapter,
} from './../../DTCD-SDK';

export class Plugin extends PanelPlugin {
  #title;
  #targetName;
  #colValue;
  #colLineValue;
  #dataSourceName;
  #storageSystem;
  #guid;
  #eventSystem;
  #dataSourceSystem;
  #dataSourceSystemGUID;

  static getRegistrationMeta() {
    return pluginMeta;
  }

  constructor(guid, selector) {
    super();

    const logSystem = new LogSystemAdapter(guid, pluginMeta.name);
    const eventSystem = new EventSystemAdapter(guid);
    const dataSourceSystem = new DataSourceSystemAdapter();

    eventSystem.registerPluginInstance(this);
    this.#guid = guid;
    this.#eventSystem = eventSystem;
    this.#storageSystem = new StorageSystemAdapter();
    this.#dataSourceSystem = new DataSourceSystemAdapter();
    this.#dataSourceSystemGUID = this.getGUID(this.getSystem('DataSourceSystem'));

    const { default: VueJS } = this.getDependence('Vue');

    const view = new VueJS({
      data: () => ({ guid, logSystem, eventSystem, dataSourceSystem }),
      render: h => h(PluginComponent),
    }).$mount(selector);

    this.vueComponent = view.$children[0];
    this.#title = '';
    this.#targetName = '';
    this.#dataSourceName = '';
  }

  loadData(data) {
    this.vueComponent.dataset = data;
    this.vueComponent.render();
  }

  processDataSourceEvent(eventData) {
    const { dataSource, status } = eventData;
    this.#dataSourceName = dataSource;
    const data = this.#storageSystem.session.getRecord(this.#dataSourceName);
    this.loadData(data);
  }

  setPluginConfig(config = {}) {
    const { title, targetName, dataSource, colValue, colLineValue } = config;

    if (typeof title !== 'undefined') {
      this.#title = title;
      this.vueComponent.setTitle(title);
    }

    if (typeof targetName !== 'undefined') {
      this.#targetName = targetName;
      this.vueComponent.setTargetName(targetName);
    }

    if (typeof colValue !== 'undefined') {
      this.#colValue = colValue;
      this.vueComponent.setColValue(colValue);
    }

    if (typeof colLineValue !== 'undefined') {
      this.#colLineValue = colLineValue;
      this.vueComponent.setColLineValue(colLineValue);
    }

    if (typeof dataSource !== 'undefined') {
      if (this.#dataSourceName) {
        this.#eventSystem.unsubscribe(
          this.#dataSourceSystemGUID,
          'DataSourceStatusUpdate',
          this.#guid,
          'processDataSourceEvent',
          { dataSource: this.#dataSourceName, status: 'success' }
        );
      }

      this.#dataSourceName = dataSource;

      this.#eventSystem.subscribe(
        this.#dataSourceSystemGUID,
        'DataSourceStatusUpdate',
        this.#guid,
        'processDataSourceEvent',
        { dataSource, status: 'success' }
      );

      const DS = this.getSystem('DataSourceSystem').getDataSource(this.#dataSourceName);
      if (DS.status === 'success') {
        const data = this.#storageSystem.session.getRecord(this.#dataSourceName);
        this.loadData(data);
      }
    }
  }

  getPluginConfig() {
    const config = {};
    if (this.#title) config.title = this.#title;
    if (this.#dataSourceName) config.dataSource = this.#dataSourceName;
    if (this.#targetName) config.targetName = this.#targetName;
    if (this.#colValue) config.colValue = this.#colValue;
    if (this.#colLineValue) config.colLineValue = this.#colLineValue;
    return config;
  }

  setFormSettings(config) {
    this.setPluginConfig(config);
  }

  getFormSettings() {
    return {
      fields: [
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
          options: Object.keys(this.#dataSourceSystem.getDataSourceList()).map(name => ({
            value: name,
          })),
        },
        {
          component: 'title',
          propValue: 'Общие настройки',
        },
        {
          component: 'text',
          propName: 'colValue',
          attrs: {
            label: 'Имя колонки со значениями',
            propValue: 'value',
            required: true,
          },
        },
        {
          component: 'text',
          propName: 'title',
          attrs: {
            label: 'Заголовок',
            required: true,
          },
        },
        {
          component: 'text',
          propName: 'colLineValue',
          attrs: {
            label: 'Имя колонки cо значениями для линий',
            propValue: 'lineValue',
            required: true,
          },
        },
        {
          component: 'text',
          propName: 'targetName',
          attrs: {
            label: 'Значение поля "name" записи целевого показателя',
            propValue: 'targetName',
            required: true,
          },
        },
      ],
    };
  }
}
