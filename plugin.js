(function() {
  'use strict';

  // ============================================================================
  // CONFIGURATION & CONSTANTS
  // ============================================================================
  
  const CONFIG = {
    api: 'lampac',
    localhost: 'https://rc.bwa.to/',
    apn: '',
    version: '1.0',
    pluginName: 'Ромашка',
    hostkey: 'https://rc.bwa.to'.replace(/https?:\/\//, '')
  };

  const EXCLUDED_BALANCERS = ['kinopub'];
  
  const TRANSLATIONS = {
    lampac_watch: {
      ru: 'Смотреть онлайн',
      en: 'Watch online',
      uk: 'Глянемо',
      zh: '在线观看'
    },
    lampac_video: {
      ru: 'Видео',
      en: 'Video',
      uk: 'Відео',
      zh: '视频'
    },
    lampac_balanser: {
      ru: 'Источник',
      uk: 'Фільтруха',
      en: 'Source',
      zh: '来源'
    },
    torrent_serial_season: {
      ru: 'Сезон',
      uk: 'Сезончик™',
      en: 'Season'
    }
    // ... other translations remain the same
  };

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const StateManager = {
    getUnicId() {
      let id = Lampa.Storage.get('lampac_unic_id', '');
      if (!id) {
        id = Lampa.Utils.uid(8).toLowerCase();
        Lampa.Storage.set('lampac_unic_id', id);
      }
      return id;
    },

    getClarificationSearch(movie) {
      const id = Lampa.Utils.hash(movie.number_of_seasons ? movie.original_name : movie.original_title);
      const all = Lampa.Storage.get('clarification_search', '{}');
      return all[id];
    },

    setClarificationSearch(movie, value) {
      const id = Lampa.Utils.hash(movie.number_of_seasons ? movie.original_name : movie.original_title);
      const all = Lampa.Storage.get('clarification_search', '{}');
      all[id] = value;
      Lampa.Storage.set('clarification_search', all);
    },

    deleteClarificationSearch(movie) {
      const id = Lampa.Utils.hash(movie.number_of_seasons ? movie.original_name : movie.original_title);
      const all = Lampa.Storage.get('clarification_search', '{}');
      delete all[id];
      Lampa.Storage.set('clarification_search', all);
    }
  };

  // ============================================================================
  // PLATFORM DETECTION
  // ============================================================================
  
  const PlatformDetector = {
    getAndroidVersion() {
      if (!Lampa.Platform.is('android')) return 0;
      try {
        const current = AndroidJS.appVersion().split('-');
        return parseInt(current.pop());
      } catch (e) {
        return 0;
      }
    },

    detectType() {
      if (Lampa.Platform.is('android')) return 'apk';
      if (Lampa.Platform.is('tizen')) return 'cors';
      return undefined;
    }
  };

  // ============================================================================
  // RCH (Remote Client Handler) SETUP
  // ============================================================================
  
  const RchManager = {
    init() {
      const hostkey = CONFIG.hostkey;
      
      if (!window.rch_nws) window.rch_nws = {};
      
      if (!window.rch_nws[hostkey]) {
        window.rch_nws[hostkey] = {
          type: PlatformDetector.detectType(),
          startTypeInvoke: false,
          rchRegistry: false,
          apkVersion: PlatformDetector.getAndroidVersion()
        };
      }

      this.setupTypeInvoke(hostkey);
      this.setupRegistry(hostkey);
    },

    setupTypeInvoke(hostkey) {
      window.rch_nws[hostkey].typeInvoke = function(host, callback) {
        if (window.rch_nws[hostkey].startTypeInvoke) {
          return callback();
        }

        window.rch_nws[hostkey].startTypeInvoke = true;

        const checkConnection = (isGood) => {
          window.rch_nws[hostkey].type = Lampa.Platform.is('android') 
            ? 'apk' 
            : isGood ? 'cors' : 'web';
          callback();
        };

        if (Lampa.Platform.is('android') || Lampa.Platform.is('tizen')) {
          checkConnection(true);
        } else {
          const net = new Lampa.Reguest();
          const checkUrl = CONFIG.localhost.indexOf(location.host) >= 0 
            ? 'https://github.com/' 
            : host + '/cors/check';
          
          net.silent(checkUrl, 
            () => checkConnection(true), 
            () => checkConnection(false), 
            false, 
            { dataType: 'text' }
          );
        }
      };
    },

    setupRegistry(hostkey) {
      window.rch_nws[hostkey].Registry = function(client, startConnection) {
        window.rch_nws[hostkey].typeInvoke(CONFIG.localhost, () => {
          client.invoke("RchRegistry", JSON.stringify({
            version: 149,
            host: location.host,
            rchtype: window.rch_nws[hostkey].type,
            apkVersion: window.rch_nws[hostkey].apkVersion,
            player: Lampa.Storage.field('player'),
            account_email: Lampa.Storage.get('account_email'),
            unic_id: StateManager.getUnicId(),
            profile_id: Lampa.Storage.get('lampac_profile_id', ''),
            token: ''
          }));

          if (client._shouldReconnect && window.rch_nws[hostkey].rchRegistry) {
            if (startConnection) startConnection();
            return;
          }

          window.rch_nws[hostkey].rchRegistry = true;

          this.setupClientHandlers(client, startConnection, hostkey);
        });
      };
    },

    setupClientHandlers(client, startConnection, hostkey) {
      client.on('RchRegistry', () => {
        if (startConnection) startConnection();
      });

      client.on("RchClient", (rchId, url, data, headers, returnHeaders) => {
        this.handleClientRequest(client, rchId, url, data, headers, returnHeaders);
      });

      client.on('Connected', (connectionId) => {
        console.log('RCH', 'ConnectionId: ' + connectionId);
        window.rch_nws[hostkey].connectionId = connectionId;
      });

      client.on('Closed', () => console.log('RCH', 'Connection closed'));
      client.on('Error', (err) => console.log('RCH', 'error:', err));
    },

    handleClientRequest(client, rchId, url, data, headers, returnHeaders) {
      const network = new Lampa.Reguest();

      const sendResult = (html) => {
        if (Lampa.Arrays.isObject(html) || Lampa.Arrays.isArray(html)) {
          html = JSON.stringify(html);
        }

        if (typeof CompressionStream !== 'undefined' && html && html.length > 1000) {
          this.compressAndSend(client, rchId, html);
        } else {
          client.invoke("RchResult", rchId, html);
        }
      };

      if (url === 'eval') {
        console.log('RCH', url, data);
        sendResult(eval(data));
      } else if (url === 'evalrun') {
        console.log('RCH', url, data);
        eval(data);
      } else if (url === 'ping') {
        sendResult('pong');
      } else {
        console.log('RCH', url);
        network["native"](url, sendResult, () => {
          console.log('RCH', 'result empty');
          sendResult('');
        }, data, {
          dataType: 'text',
          timeout: 8000,
          headers,
          returnHeaders
        });
      }
    },

    compressAndSend(client, rchId, html) {
      const compressionStream = new CompressionStream('gzip');
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(html));
          controller.close();
        }
      });

      readable.pipeThrough(compressionStream)
        .then(stream => new Response(stream).arrayBuffer())
        .then(compressedBuffer => {
          const compressedArray = new Uint8Array(compressedBuffer);
          
          if (compressedArray.length > html.length) {
            client.invoke("RchResult", rchId, html);
          } else {
            $.ajax({
              url: CONFIG.localhost + '/rch/gzresult?id=' + rchId,
              type: 'POST',
              data: compressedArray,
              async: true,
              cache: false,
              contentType: false,
              processData: false,
              success: () => {},
              error: () => client.invoke("RchResult", rchId, html)
            });
          }
        })
        .catch(() => client.invoke("RchResult", rchId, html));
    }
  };

  // ============================================================================
  // ACCOUNT HELPER
  // ============================================================================
  
  function buildAccountUrl(url) {
    url = String(url);
    
    const params = new URLSearchParams();
    
    if (!url.includes('account_email=')) {
      const email = Lampa.Storage.get('account_email');
      if (email) params.append('account_email', email);
    }
    
    if (!url.includes('uid=')) {
      const uid = StateManager.getUnicId();
      if (uid) params.append('uid', uid);
    }
    
    if (!url.includes('token=')) {
      params.append('token', '');
    }
    
    if (!url.includes('nws_id=') && window.rch_nws?.[CONFIG.hostkey]?.connectionId) {
      params.append('nws_id', window.rch_nws[CONFIG.hostkey].connectionId);
    }
    
    const paramString = params.toString();
    if (!paramString) return url;
    
    return Lampa.Utils.addUrlComponent(url, paramString);
  }

  // ============================================================================
  // BALANCER FILTERING
  // ============================================================================
  
  function filterBalancers(balancers) {
    return balancers.filter(b => {
      const name = (b.balanser || b.name || '').toLowerCase();
      return !EXCLUDED_BALANCERS.some(excluded => name.includes(excluded));
    });
  }

  // ============================================================================
  // COMPONENT (keeping main structure but with improvements)
  // ============================================================================
  
  function component(object) {
    const network = new Lampa.Reguest();
    const scroll = new Lampa.Scroll({ mask: true, over: true });
    const files = new Lampa.Explorer(object);
    const filter = new Lampa.Filter(object);
    
    let sources = {};
    let balanser;
    let initialized = false;
    let images = [];
    
    // ... rest of component code would follow similar refactoring patterns
    // (breaking down large methods, extracting helpers, etc.)
    
    this.initialize = function() {
      // Simplified initialization
      this.loading(true);
      this.setupFilter();
      this.setupScroll();
      this.loadBalancers();
    };
    
    // Additional methods...
  }

  // ============================================================================
  // PLUGIN INITIALIZATION
  // ============================================================================
  
  function startPlugin() {
    if (window.romashka_plugin) return;
    window.romashka_plugin = true;

    // Initialize RCH
    RchManager.init();

    // Register manifest
    const manifest = {
      type: 'video',
      version: CONFIG.version,
      name: CONFIG.pluginName,
      description: 'Плагін для перегляду онлайн серіалів та фільмів',
      component: 'romashka',
      onContextMenu: (object) => ({
        name: Lampa.Lang.translate('lampac_watch'),
        description: ''
      }),
      onContextLauch: (object) => {
        resetTemplates();
        Lampa.Component.add('romashka', component);
        
        const clarification = StateManager.getClarificationSearch(object);
        
        Lampa.Activity.push({
          url: '',
          title: Lampa.Lang.translate('title_online'),
          component: 'romashka',
          search: clarification || object.title,
          search_one: object.title,
          search_two: object.original_title,
          movie: object,
          page: 1,
          clarification: !!clarification
        });
      }
    };

    Lampa.Manifest.plugins = manifest;

    // Add translations
    Object.entries(TRANSLATIONS).forEach(([key, value]) => {
      Lampa.Lang.add({ [key]: value });
    });

    // Add CSS
    addStyles();
    
    // Add templates
    resetTemplates();

    // Setup button injection
    setupButtonInjection();

    // Sync storage
    syncStorage();
  }

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================
  
  function resetTemplates() {
    // Template definitions...
    Lampa.Template.add('lampac_prestige_full', `...`);
    // etc.
  }

  function addStyles() {
    Lampa.Template.add('lampac_css', `<style>/* CSS here */</style>`);
    $('body').append(Lampa.Template.get('lampac_css', {}, true));
  }

  function setupButtonInjection() {
    const button = `
      <div class="full-start__button selector view--online lampac--button" 
           data-subtitle="${CONFIG.pluginName} v${CONFIG.version}">
        <!-- SVG icon -->
        <span>#{title_online}</span>
      </div>
    `;

    function addButton(e) {
      if (e.render.find('.lampac--button').length) return;
      
      const btn = $(Lampa.Lang.translate(button));
      btn.on('hover:enter', () => {
        resetTemplates();
        Lampa.Component.add('romashka', component);
        
        const clarification = StateManager.getClarificationSearch(e.movie);
        
        Lampa.Activity.push({
          url: '',
          title: Lampa.Lang.translate('title_online'),
          component: 'romashka',
          search: clarification || e.movie.title,
          search_one: e.movie.title,
          search_two: e.movie.original_title,
          movie: e.movie,
          page: 1,
          clarification: !!clarification
        });
      });
      
      e.render.after(btn);
    }

    Lampa.Listener.follow('full', (e) => {
      if (e.type === 'complite') {
        addButton({
          render: e.object.activity.render().find('.view--torrent'),
          movie: e.data.movie
        });
      }
    });
  }

  function syncStorage() {
    if (Lampa.Manifest.app_digital >= 177) {
      const balancersSync = [
        "filmix", "filmixtv", "fxapi", "rezka", "rhsprem", "lumex",
        // ... (excluding kinopub)
      ];
      
      balancersSync.forEach(name => {
        Lampa.Storage.sync('online_choice_' + name, 'object_object');
      });
      
      Lampa.Storage.sync('online_watched_last', 'object_object');
    }
  }

  // ============================================================================
  // START
  // ============================================================================
  
  startPlugin();

})();
