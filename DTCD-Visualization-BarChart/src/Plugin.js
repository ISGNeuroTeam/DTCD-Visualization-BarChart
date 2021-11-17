import pluginMeta from './Plugin.Meta';
import PluginComponent from './PluginComponent.vue';

import {
  PanelPlugin,
  LogSystemAdapter,
  EventSystemAdapter,
  DataSourceSystemAdapter,
} from './../../DTCD-SDK';

export class Plugin extends PanelPlugin {
  static getRegistrationMeta() {
    return pluginMeta;
  }

  #guid;
  #dataSourceSystemGUID;
  #dataSourceName;
  #logSystem;
  #dataSourceSystem;
  #eventSystem;

  constructor(guid, selector) {
    super();

    this.#guid = guid;
    this.#dataSourceSystemGUID = this.getGUID(this.getSystem('DataSourceSystem'));
    const logSystem = (this.#logSystem = new LogSystemAdapter(guid, pluginMeta.name));
    const eventSystem = (this.#eventSystem = new EventSystemAdapter(guid));
    eventSystem.registerPluginInstance(this);
    const dataSourceSystem = (this.#dataSourceSystem = new DataSourceSystemAdapter());

    const { default: VueJS } = this.getDependence('Vue');

    const view = new VueJS({
      data: () => ({ guid, logSystem, eventSystem, dataSourceSystem }),
      render: h => h(PluginComponent),
    }).$mount(selector);

    this.vueComponent = view.$children[0];
    this.#dataSourceName = '';
  }

  loadData(data) {
    this.vueComponent.dataset = data.toArray();
    this.vueComponent.render();
  }

  async setPluginConfig(config = {}) {
    const { targetName, dataSource } = config;

    this.vueComponent.targetName = targetName;

    // <TEMP>
    const ds = await this.#dataSourceSystem.createDataSource(dataSource);
    this.#eventSystem.subscribe(
      this.#dataSourceSystemGUID,
      `${dataSource.name}-UPDATE`,
      this.#guid,
      'loadData'
    );
    this.getSystem('EventSystem').publishEvent(
      this.#dataSourceSystemGUID,
      `${dataSource.name}-UPDATE`,
      ds
    );
    // </TEMP>
  }

  getPluginConfig() {
    return {
      targetName: 'План-3',
      dataSource: {
        type: 'OTL',
        name: 'DS-1',
        original_otl:
          'makeresults count=10| streamstats count as x| eval value=20-x | eval lineValue=15-x| eval name="План-"+x ',
      },
    };
  }

  setFormSettings() {}

  getFormSettings() {}
}
