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
  #dataSourceName;
  #storageSystem;
  #guid;
  #eventSystem;
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
    const { title, targetName, dataSource } = config;

    if (typeof title !== 'undefined') {
      this.#title = title;
      this.vueComponent.setTitle(title);
    }

    if (typeof targetName !== 'undefined') {
      this.#targetName = targetName;
      this.vueComponent.setTargetName(targetName);
    }

    if (typeof dataSource !== 'undefined') {
      if (this.#dataSourceName) {
        this.#eventSystem.unsubscribe(
          this.#dataSourceSystemGUID,
          'DataSourceStatusUpdate',
          this.#guid,
          'processDataSourceEvent',
          { dataSource: this.#dataSourceName, status: 'success' },
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
    return config;
  }

  setFormSettings() {}

  getFormSettings() {}
}
