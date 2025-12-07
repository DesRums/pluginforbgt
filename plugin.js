(function() {
  'use strict';

  var Defined = {
    api: 'lampac',
    localhost: 'https://rc.bwa.to/',
    apn: ''
  };

  var balansers_with_search;
  
  var unic_id = Lampa.Storage.get('lampac_unic_id', '');
  if (!unic_id) {
    unic_id = Lampa.Utils.uid(8).toLowerCase();
    Lampa.Storage.set('lampac_unic_id', unic_id);
  }
  
    function getAndroidVersion() {
  if (Lampa.Platform.is('android')) {
    try {
      var current = AndroidJS.appVersion().split('-');
      return parseInt(current.pop());
    } catch (e) {
      return 0;
    }
  } else {
    return 0;
  }
}

var hostkey = 'https://rc.bwa.to'.replace('http://', '').replace('https://', '');

if (!window.rch_nws || !window.rch_nws[hostkey]) {
  if (!window.rch_nws) window.rch_nws = {};

  window.rch_nws[hostkey] = {
    type: Lampa.Platform.is('android') ? 'apk' : Lampa.Platform.is('tizen') ? 'cors' : undefined,
    startTypeInvoke: false,
    rchRegistry: false,
    apkVersion: getAndroidVersion()
  };
}

window.rch_nws[hostkey].typeInvoke = function rchtypeInvoke(host, call) {
  if (!window.rch_nws[hostkey].startTypeInvoke) {
    window.rch_nws[hostkey].startTypeInvoke = true;
    var check = function check(good) {
      window.rch_nws[hostkey].type = Lampa.Platform.is('android') ? 'apk' : good ? 'cors' : 'web';
      call();
    };

    if (Lampa.Platform.is('android') || Lampa.Platform.is('tizen')) check(true);
    else {
      var net = new Lampa.Reguest();
      net.silent('https://rc.bwa.to'.indexOf(location.host) >= 0 ? 'https://github.com/' : host + '/cors/check', function() {
        check(true);
      }, function() {
        check(false);
      }, false, {
        dataType: 'text'
      });
    }
  } else call();
};

window.rch_nws[hostkey].Registry = function RchRegistry(client, startConnection) {
  window.rch_nws[hostkey].typeInvoke('https://rc.bwa.to', function() {

    client.invoke("RchRegistry", JSON.stringify({
      version: 149,
      host: location.host,
      rchtype: Lampa.Platform.is('android') ? 'apk' : Lampa.Platform.is('tizen') ? 'cors' : window.rch_nws[hostkey].type,
      apkVersion: window.rch_nws[hostkey].apkVersion,
      player: Lampa.Storage.field('player'),
	  account_email: Lampa.Storage.get('account_email'),
	  unic_id: Lampa.Storage.get('lampac_unic_id', ''),
	  profile_id: Lampa.Storage.get('lampac_profile_id', ''),
	  token: ''
    }));

    if (client._shouldReconnect && window.rch_nws[hostkey].rchRegistry) {
      if (startConnection) startConnection();
   
      return;
    }

    window.rch_nws[hostkey].rchRegistry = true;

    client.on('RchRegistry', function(clientIp) {
      if (startConnection) startConnection();
    });

    client.on("RchClient", function(rchId, url, data, headers, returnHeaders) {
      var network = new Lampa.Reguest();
      function result(html) {
        if (Lampa.Arrays.isObject(html) || Lampa.Arrays.isArray(html)) {
          html = JSON.stringify(html);
        }

        if (typeof CompressionStream !== 'undefined' && html && html.length > 1000) {
          var compressionStream = new CompressionStream('gzip');
          var encoder = new TextEncoder();
          var readable = new ReadableStream({
            start: function(controller) {
              controller.enqueue(encoder.encode(html));
              controller.close();
            }
          });
          var compressedStream = readable.pipeThrough(compressionStream);
          new Response(compressedStream).arrayBuffer()
            .then(function(compressedBuffer) {
              var compressedArray = new Uint8Array(compressedBuffer);
              if (compressedArray.length > html.length) {
                client.invoke("RchResult", rchId, html);
              } else {
            
                $.ajax({
                  url: 'https://rc.bwa.to/rch/gzresult?id=' + rchId,
                  type: 'POST',
                  data: compressedArray,
                  async: true,
                  
                  cache: false,
                  contentType: false,
                  processData: false,
                  success: function(j) {},
                  error: function() {
                    client.invoke("RchResult", 
                      rchId, html);
                  }
                });
              }
            })
            .catch(function() {
              client.invoke("RchResult", rchId, html);
          
            });

        } else {
          client.invoke("RchResult", rchId, html);
        }
      }

      if (url == 'eval') {
        console.log('RCH', url, data);
        result(eval(data));
      } else if (url == 'evalrun') {
        console.log('RCH', url, data);
        eval(data);
      } else if (url == 'ping') {
        result('pong');
      } else {
        console.log('RCH', url);
        network["native"](url, result, function() {
          console.log('RCH', 'result empty');
          result('');
        }, data, {
          dataType: 'text',
          timeout: 1000 * 8,
          headers: headers,
          returnHeaders: returnHeaders
        });
      }
    });

    client.on('Connected', function(connectionId) {
      console.log('RCH', 'ConnectionId: ' + connectionId);
      window.rch_nws[hostkey].connectionId = connectionId;
    });
    client.on('Closed', function() {
      console.log('RCH', 'Connection closed');
    });
    client.on('Error', function(err) {
      console.log('RCH', 'error:', err);
    });
  });
};
  window.rch_nws[hostkey].typeInvoke('https://rc.bwa.to', function() {});
  function rchInvoke(json, call) {
    if (window.nwsClient && window.nwsClient[hostkey] && window.nwsClient[hostkey]._shouldReconnect){
      call();
      return;
    }
    if (!window.nwsClient) window.nwsClient = {};
    if (window.nwsClient[hostkey] && window.nwsClient[hostkey].socket)
      window.nwsClient[hostkey].socket.close();
    window.nwsClient[hostkey] = new NativeWsClient(json.nws, {
      autoReconnect: false
    });
    window.nwsClient[hostkey].on('Connected', function(connectionId) {
      window.rch_nws[hostkey].Registry(window.nwsClient[hostkey], function() {
        call();
      });
    });
    window.nwsClient[hostkey].connect();
  }

  function rchRun(json, call) {
    if (typeof NativeWsClient == 'undefined') {
      Lampa.Utils.putScript(["https://rc.bwa.to/js/nws-client-es5.js?v18112025"], function() {}, false, function() {
        rchInvoke(json, call);
      }, true);
    } else {
      rchInvoke(json, call);
    }
  }

  function account(url) {
    url = url + '';
    if (url.indexOf('account_email=') == -1) {
      var email = Lampa.Storage.get('account_email');
      if (email) url = Lampa.Utils.addUrlComponent(url, 'account_email=' + encodeURIComponent(email));
    }
    if (url.indexOf('uid=') == -1) {
      var uid = Lampa.Storage.get('lampac_unic_id', '');
      if (uid) url = Lampa.Utils.addUrlComponent(url, 'uid=' + encodeURIComponent(uid));
    }
    if (url.indexOf('token=') == -1) {
      var token = '';
      if (token != '') url = Lampa.Utils.addUrlComponent(url, 'token=');
    }
    if (url.indexOf('nws_id=') == -1 && window.rch_nws && window.rch_nws[hostkey]) {
      var nws_id = window.rch_nws[hostkey].connectionId ||
        '';
      if (nws_id) url = Lampa.Utils.addUrlComponent(url, 'nws_id=' + encodeURIComponent(nws_id));
    }
    return url;
  }
  
  var Network = Lampa.Reguest;

  function component(object) {
    var network = new Network();
    var scroll = new Lampa.Scroll({
      mask: true,
      over: true
    });
    var files = new Lampa.Explorer(object);
    var filter = new Lampa.Filter(object);
    var sources = {};
    var last;
    var source;
    var balanser;
    var initialized;
    var balanser_timer;
    var images = [];
    var number_of_requests = 0;
    var number_of_requests_timer;
    var life_wait_times = 0;
    var life_wait_timer;
    var filter_sources = {};
    var filter_translate = {
      season: Lampa.Lang.translate('torrent_serial_season'),
      voice: Lampa.Lang.translate('torrent_parser_voice'),
      source: Lampa.Lang.translate('settings_rest_source')
    };
    var filter_find = {
      season: [],
      voice: []
    };
    if (balansers_with_search == undefined) {
      network.timeout(10000);
      network.silent(account('https://rc.bwa.to/lite/withsearch'), function(json) {
        balansers_with_search = json;
      }, function() {
		  balansers_with_search = [];
	  });
    }
	
    function balanserName(j) {
      var bals = j.balanser;
      var name = j.name.split(' ')[0];
      return (bals || name).toLowerCase();
    }
	
	function clarificationSearchAdd(value){
		var id = Lampa.Utils.hash(object.movie.number_of_seasons ? object.movie.original_name : object.movie.original_title);
		var all = Lampa.Storage.get('clarification_search','{}');
		
		all[id] = value;
		
		Lampa.Storage.set('clarification_search',all);
	}
	
	function clarificationSearchDelete(){
		var id = Lampa.Utils.hash(object.movie.number_of_seasons ? object.movie.original_name : object.movie.original_title);
		var all = Lampa.Storage.get('clarification_search','{}');
		
		delete all[id];
		
		Lampa.Storage.set('clarification_search',all);
	}
	
	function clarificationSearchGet(){
		var id = Lampa.Utils.hash(object.movie.number_of_seasons ? object.movie.original_name : object.movie.original_title);
		var all = Lampa.Storage.get('clarification_search','{}');
		return all[id];
	}
	
    this.initialize = function() {
      var _this = this;
      this.loading(true);
      filter.onSearch = function(value) {
		  
		clarificationSearchAdd(value);
		
        Lampa.Activity.replace({
          search: value,
          clarification: true,
          similar: true
        });
      };
      filter.onBack = function() {
        _this.start();
      };
      filter.render().find('.selector').on('hover:enter', function() {
        clearInterval(balanser_timer);
      });
      filter.render().find('.filter--search').appendTo(filter.render().find('.torrent-filter'));
      filter.onSelect = function(type, a, b) {
        if (type == 'filter') {
          if (a.reset) {
			  clarificationSearchDelete();
            _this.replaceChoice({
              season: 0,
              voice: 0,
              voice_url: '',
              voice_name: ''
            });
            setTimeout(function() {
              Lampa.Select.close();
              Lampa.Activity.replace({
				  clarification: 0,
				  similar: 0
			  });
            }, 10);
          } else {
            var url = filter_find[a.stype][b.index].url;
            var choice = _this.getChoice();
            if (a.stype == 'voice') {
              choice.voice_name = filter_find.voice[b.index].title;
              choice.voice_url = url;
            }
            choice[a.stype] = b.index;
            _this.saveChoice(choice);
            _this.reset();
            _this.request(url);
            setTimeout(Lampa.Select.close, 10);
          }
        } else if (type == 'sort') {
          Lampa.Select.close();
          object.lampac_custom_select = a.source;
          _this.changeBalanser(a.source);
        }
      };
      if (filter.addButtonBack) filter.addButtonBack();
      filter.render().find('.filter--sort span').text(Lampa.Lang.translate('lampac_balanser'));
      scroll.body().addClass('torrent-list');
      files.appendFiles(scroll.render());
      files.appendHead(filter.render());
      scroll.minus(files.render().find('.explorer__files-head'));
      scroll.body().append(Lampa.Template.get('lampac_content_loading'));
      Lampa.Controller.enable('content');
      this.loading(false);
	  if(object.balanser){
		  files.render().find('.filter--search').remove();
		  sources = {};
		  sources[object.balanser] = {name: object.balanser};
		  balanser = object.balanser;
		  filter_sources = [];
		  return network["native"](account(object.url.replace('rjson=','nojson=')), this.parse.bind(this), function(){
			  files.render().find('.torrent-filter').remove();
			  _this.empty();
		  }, false, {
            dataType: 'text'
		  });
	  } 
      this.externalids().then(function() {
        return _this.createSource();
      }).then(function(json) {
        if (!balansers_with_search.find(function(b) {
            return balanser.slice(0, b.length) == b;
          })) {
          filter.render().find('.filter--search').addClass('hide');
        }
        _this.search();
      })["catch"](function(e) {
      
        _this.noConnectToServer(e);
      });
    };
    this.rch = function(json, noreset) {
      var _this2 = this;
      rchRun(json, function() {
        if (!noreset) _this2.find();
        else noreset();
	  });
    };
    this.externalids = function() {
      return new Promise(function(resolve, reject) {
        if (!object.movie.imdb_id || !object.movie.kinopoisk_id) {
          var query = [];
          query.push('id=' + encodeURIComponent(object.movie.id));
          query.push('serial=' + (object.movie.name ? 1 : 0));
          if (object.movie.imdb_id) query.push('imdb_id=' + (object.movie.imdb_id || ''));
          if (object.movie.kinopoisk_id) query.push('kinopoisk_id=' + (object.movie.kinopoisk_id || ''));
 
          var url = Defined.localhost + 'externalids?' + query.join('&');
          network.timeout(10000);
          network.silent(account(url), function(json) {
            for (var name in json) {
              object.movie[name] = json[name];
            }
            resolve();
     
          }, function() {
            resolve();
          });
        } else resolve();
      });
    };
    this.updateBalanser = function(balanser_name) {
      var last_select_balanser = Lampa.Storage.cache('online_last_balanser', 3000, {});
      last_select_balanser[object.movie.id] = balanser_name;
      Lampa.Storage.set('online_last_balanser', last_select_balanser);
    };
    this.changeBalanser = function(balanser_name) {
      this.updateBalanser(balanser_name);
      Lampa.Storage.set('online_balanser', balanser_name);
      var to = this.getChoice(balanser_name);
      var from = this.getChoice();
      if (from.voice_name) to.voice_name = from.voice_name;
      this.saveChoice(to, balanser_name);
      Lampa.Activity.replace();
    };
    this.requestParams = function(url) {
      var query = [];
      var card_source = object.movie.source || 'tmdb';
      //Lampa.Storage.field('source')
      query.push('id=' + encodeURIComponent(object.movie.id));
      if (object.movie.imdb_id) query.push('imdb_id=' + (object.movie.imdb_id || ''));
      if (object.movie.kinopoisk_id) query.push('kinopoisk_id=' + (object.movie.kinopoisk_id || ''));
	  if (object.movie.tmdb_id) query.push('tmdb_id=' + (object.movie.tmdb_id || ''));
      query.push('title=' + encodeURIComponent(object.clarification ? object.search : object.movie.title || object.movie.name));
      query.push('original_title=' + encodeURIComponent(object.movie.original_title || object.movie.original_name));
      query.push('serial=' + (object.movie.name ? 1 : 0));
      query.push('original_language=' + (object.movie.original_language || ''));
      query.push('year=' + ((object.movie.release_date || object.movie.first_air_date || '0000') + '').slice(0, 4));
      query.push('source=' + card_source);
      query.push('clarification=' + (object.clarification ? 1 : 0));
      query.push('similar=' + (object.similar ? true : false));
      query.push('rchtype=' + (((window.rch_nws && window.rch_nws[hostkey]) ? window.rch_nws[hostkey].type : (window.rch && window.rch[hostkey]) ? window.rch[hostkey].type : '') || ''));
      if (Lampa.Storage.get('account_email', '')) query.push('cub_id=' + Lampa.Utils.hash(Lampa.Storage.get('account_email', '')));
      return url + (url.indexOf('?') >= 0 ? '&' : '?') + query.join('&');
    };
    this.getLastChoiceBalanser = function() {
      var last_select_balanser = Lampa.Storage.cache('online_last_balanser', 3000, {});
      if (last_select_balanser[object.movie.id]) {
        return last_select_balanser[object.movie.id];
      } else {
        return Lampa.Storage.get('online_balanser', filter_sources.length ? filter_sources[0] : '');
      }
    };
    this.startSource = function(json) {
      return new Promise(function(resolve, reject) {
        json.forEach(function(j) {
          var name = balanserName(j);
          sources[name] = {
            url: j.url,
            name: j.name,
            show: typeof j.show == 'undefined' ? true : j.show
  
          };
        });
        filter_sources = Lampa.Arrays.getKeys(sources);
        if (filter_sources.length) {
          var last_select_balanser = Lampa.Storage.cache('online_last_balanser', 3000, {});
          if (last_select_balanser[object.movie.id]) {
            balanser = last_select_balanser[object.movie.id];
          } else {
           
            balanser = Lampa.Storage.get('online_balanser', filter_sources[0]);
          }
          if (!sources[balanser]) balanser = filter_sources[0];
          if (!sources[balanser].show && !object.lampac_custom_select) balanser = filter_sources[0];
          source = sources[balanser].url;
          Lampa.Storage.set('active_balanser', balanser);
          resolve(json);
        } else {
          reject();
        }
      });
    };
    this.lifeSource = function() {
      var _this3 = this;
      return new Promise(function(resolve, reject) {
        var url = _this3.requestParams(Defined.localhost + 'lifeevents?memkey=' + (_this3.memkey || ''));
        var red = false;
        var gou = function gou(json, any) {
          if (json.accsdb) return reject(json);
          var last_balanser = _this3.getLastChoiceBalanser();
          if (!red) {
            var _filter = json.online.filter(function(c) 
            {
              return any ? c.show : c.show && c.name.toLowerCase() == last_balanser;
            });
            if (_filter.length) {
              red = true;
              resolve(json.online.filter(function(c) {
                return c.show;
   
              }));
            } else if (any) {
              reject();
            }
          }
        };
        var fin = function fin(call) {
          network.timeout(3000);
      
          network.silent(account(url), function(json) {
            life_wait_times++;
            filter_sources = [];
            sources = {};
            json.online.forEach(function(j) {
              var name = balanserName(j);
              sources[name] = {
                url: j.url,
                name: j.name,
                show: typeof j.show == 'undefined' ? true : j.show
        
              };
            });
            filter_sources = Lampa.Arrays.getKeys(sources);
            filter.set('sort', filter_sources.map(function(e) {
              return {
                title: sources[e].name,
                source: e,
                selected: e == balanser,
                ghost: !sources[e].show
          
              };
            }));
            filter.chosen('sort', [sources[balanser] ? sources[balanser].name : balanser]);
            gou(json);
            var lastb = _this3.getLastChoiceBalanser();
            if (life_wait_times > 15 || json.ready) {
              filter.render().find('.lampac-balanser-loader').remove();
              gou(json, true);
            } else if (!red && sources[lastb] && sources[lastb].show) {
              gou(json, true);
              life_wait_timer = setTimeout(fin, 1000);
            } else {
              life_wait_timer = setTimeout(fin, 1000);
            }
          }, function() {
            life_wait_times++;
            if (life_wait_times > 15) {
              reject();
            } else {
              life_wait_timer = setTimeout(fin, 1000);
            }
          });
        };
        fin();
      });
    };
    this.createSource = function() {
      var _this4 = this;
      return new Promise(function(resolve, reject) {
        var url = _this4.requestParams(Defined.localhost + 'lite/events?life=true');
        network.timeout(15000);
        network.silent(account(url), function(json) {
          if (json.accsdb) return reject(json);
          if (json.life) {
			_this4.memkey = json.memkey;
			if (json.title) {
              if (object.movie.name) object.movie.name = json.title;
              if (object.movie.title) object.movie.title = 
                json.title;
			}
            filter.render().find('.filter--sort').append('<span class="lampac-balanser-loader" style="width: 1.2em; height: 1.2em; margin-top: 0; background: url(./img/loader.svg) no-repeat 50% 50%; background-size: contain; margin-left: 0.5em"></span>');
            _this4.lifeSource().then(_this4.startSource).then(resolve)["catch"](reject);
          } else {
            _this4.startSource(json).then(resolve)["catch"](reject);
          }
        }, reject);
      });
    };
    /**
     * Подготовка
     */
    this.create = function() {
      return this.render();
    };
    /**
     * Начать поиск
     */
    this.search = function() { //this.loading(true)
      this.filter({
        source: filter_sources
      }, this.getChoice());
      this.find();
    };
    this.find = function() {
      this.request(this.requestParams(source));
    };
    this.request = function(url) {
      number_of_requests++;
      if (number_of_requests < 10) {
        network["native"](account(url), this.parse.bind(this), this.doesNotAnswer.bind(this), false, {
          dataType: 'text'
        });
        clearTimeout(number_of_requests_timer);
        number_of_requests_timer = setTimeout(function() {
          number_of_requests = 0;
        }, 4000);
      } else this.empty();
    };
    this.parseJsonDate = function(str, name) {
      try {
        var html = $('<div>' + str + '</div>');
        var elems = [];
        html.find(name).each(function() {
          var item = $(this);
          var data = JSON.parse(item.attr('data-json'));
          var season = item.attr('s');
          var episode = item.attr('e');
          var text = item.text();
          if (!object.movie.name) {
            if (text.match(/\d+p/i)) {
    
              if (!data.quality) {
                data.quality = {};
                data.quality[text] = data.url;
              }
              text = object.movie.title;
            }
          
            if (text == 'По умолчанию') {
              text = object.movie.title;
            }
          }
          if (episode) data.episode = parseInt(episode);
          if (season) data.season = parseInt(season);
          if (text) data.text = text;
          data.active = item.hasClass('active');
 
          elems.push(data);
        });
        return elems;
      } catch (e) {
        return [];
      }
    };
    this.getFileUrl = function(file, call, waiting_rch) {
	  var _this = this;
      if(Lampa.Storage.field('player') !== 'inner' && file.stream && Lampa.Platform.is('apple')){
		  var newfile = Lampa.Arrays.clone(file);
		  newfile.method = 'play';
		  newfile.url = file.stream;
		  call(newfile, {});
      }
      else if (file.method == 'play') call(file, {});
      else {
        Lampa.Loading.start(function() {
          Lampa.Loading.stop();
          Lampa.Controller.toggle('content');
          network.clear();
        });
        network["native"](account(file.url), function(json) {
			if(json.rch){
				if(waiting_rch) {
					Lampa.Loading.stop();
					call(false, {});
				}
				else {
					_this.rch(json,function(){
						Lampa.Loading.stop();
						
						_this.getFileUrl(file, call, true);
					});
				}
			}
			else{
				Lampa.Loading.stop();
				call(json, json);
			}
        }, function() {
          Lampa.Loading.stop();
          call(false, {});
        });
      }
    };
    this.toPlayElement = function(file) {
      var play = {
        title: file.title,
        url: file.url,
        quality: file.qualitys,
        timeline: file.timeline,
        subtitles: file.subtitles,
		segments: file.segments,
        callback: file.mark,
		season: file.season,
		episode: file.episode,
		voice_name: file.voice_name
      };
      return play;
    };
    this.orUrlReserve = function(data) {
      if (data.url && typeof data.url == 'string' && data.url.indexOf(" or ") !== -1) {
        var urls = data.url.split(" or ");
        data.url = urls[0];
        data.url_reserve = urls[1];
      }
    };
    this.setDefaultQuality = function(data) {
      if (Lampa.Arrays.getKeys(data.quality).length) {
        for (var q in data.quality) {
          if (parseInt(q) == Lampa.Storage.field('video_quality_default')) {
            data.url = data.quality[q];
            this.orUrlReserve(data);
          }
          if (data.quality[q].indexOf(" or ") !== -1)
            data.quality[q] = data.quality[q].split(" or ")[0];
        }
      }
    };
    this.display = function(videos) {
      var _this5 = this;
      this.draw(videos, {
        onEnter: function onEnter(item, html) {
          _this5.getFileUrl(item, function(json, json_call) {
            if (json && json.url) {
              var playlist = [];
              var first = _this5.toPlayElement(item);
              first.url = json.url;
        
              first.headers = json_call.headers || json.headers;
              first.quality = json_call.quality || item.qualitys;
			  first.segments = json_call.segments || item.segments;
              playlist.push(first);
              if (json_call.playlist) {
                json_call.playlist.forEach(function(el) {
                  var element = _this5.toPlayElement(el);
                  element.url = el.url;
                  element.quality = el.quality;
                  element.segments = el.segments;
                  element.headers = el.headers;
                  playlist.push(element);
                });
              }
              if (item.url_reserve) {
                var reserve = Lampa.Arrays.clone(first);
                reserve.url = item.url_reserve;
                playlist.push(reserve);
              }
              if (json.reserve) {
                json.reserve.forEach(function(el) {
                  var element = _this5.toPlayElement(el);
                  element.url = el.url;
                  element.quality = el.quality;
                  element.segments = el.segments;
                  element.headers = el.headers;
                  playlist.push(element);
                });
              }
              var element = first;
              element.isonline = true;
              if (element.url && element.isonline) { // online.js
                // ... (Original logic for player launch is here)
              } else if (element.url) {
                if (false) {
                  if (Lampa.Platform.is('browser') && location.host.indexOf("127.0.0.1") !== -1) {
                    Lampa.Noty.show('Видео открыто в playerInner', {time: 3000});
                    Lampa.Utils.post('https://rc.bwa.to/player-inner/' + element.url);
                    return;
                  }
                  Lampa.Player.play(element);
                } else {
                  if (true && Lampa.Platform.is('browser') && location.host.indexOf("127.0.0.1") !== -1) Lampa.Noty.show('Внешний плеер можно указать в init.conf (playerInner)', {time: 3000});
                  Lampa.Player.play(element);
                }
              }
              Lampa.Player.play(element);
              Lampa.Player.playlist(playlist);
              if(element.subtitles_call) _this5.loadSubtitles(element.subtitles_call);
              item.mark();
              _this5.updateBalanser(balanser);
            } else {
              Lampa.Noty.show(Lampa.Lang.translate('lampac_nolink'));
            }
          } else Lampa.Noty.show(Lampa.Lang.translate('lampac_nolink'));
        }, true);
        }, onContextMenu: function onContextMenu(item, html, data, call) { _this5.getFileUrl(item, function(stream) { call({ file: stream.url, quality: item.qualitys }); }, true);
        }
      });
      this.filter({ season: filter_find.season.map(function(s) { return s.title; }), voice: filter_find.voice.map(function(b) { return b.title; }) }, this.getChoice());
    };
    this.loadSubtitles = function(link){ network.silent(account(link), function(subs){ Lampa.Player.subtitles(subs) }) }
    this.parse = function(str) {
      try {
        var _this6 = this;
        var json = JSON.parse(str);
        if (json.accsdb) return this.noConnectToServer(json);
        if (json.similars) {
          this.similars(json.similars);
          return;
        }
        var videos = [];
        var html = $('<div>' + json.data + '</div>');
        var select_season_url = html.find('[data-name="season"].active').data('url');
        if (select_season_url) {
          var select_season = this.getChoice(balanser).season;
          var season = filter_find.season[select_season];
          if (!season) season = filter_find.season[0];
          //console.log('Lampac', 'go to season', season);
          this.request(season.url);
        }
        html.find('[data-name="file"]').each(function() {
          var item = $(this);
          var data = JSON.parse(item.attr('data-json'));
          var season = item.attr('s');
          var episode = item.attr('e');
          var text = item.text();
          if (!object.movie.name) {
            if (text.match(/\d+p/i)) {
              if (!data.quality) {
                data.quality = {};
                data.quality[text] = data.url;
              }
              text = object.movie.title;
            }
          }
          if (episode) data.episode = parseInt(episode);
          if (season) data.season = parseInt(season);
          if (text) data.text = text;
          data.active = item.hasClass('active');
          videos.push(data);
        });
        if (!videos.length && !json.filters && json.data) {
          this.empty();
          return;
        }
        if (json.filters) {
          filter_find.season = this.parseJsonDate(json.filters, '[data-name="season"]');
          filter_find.voice = this.parseJsonDate(json.filters, '[data-name="voice"]');
          if (!filter_find.voice.length) {
            var voice = this.getChoice().voice;
            if (voice > 0) {
              this.replaceChoice({
                voice: 0
              });
              var select_season = this.getChoice(balanser).season;
              var season = filter_find.season[select_season];
              if (!season) season = filter_find.season[0];
              this.request(season.url);
            }
          }
          this.display(videos);
          if (json.data.length && object.movie.name && filter_find.season.length) {
            var select_season = this.getChoice(balanser).season;
            var season = filter_find.season[select_season];
            if (!season) season = filter_find.season[0];
            //console.log('Lampac', 'go to season', season);
            this.request(season.url);
          }
        } else {
          this.doesNotAnswer(json);
        }
      } catch (e) {
        //console.log('Lampac', 'error', e.stack);
        this.doesNotAnswer(e);
      }
    };
    this.similars = function(json) {
      var _this6 = this;
      scroll.clear();
      json.forEach(function(elem) {
        elem.title = elem.text;
        elem.info = '';
        var info = [];
        var year = ((elem.start_date || elem.year || object.movie.release_date || object.movie.first_air_date || '') + '').slice(0, 4);
        if (year) info.push(year);
        if (elem.details) info.push(elem.details);
        var name = elem.title || elem.text;
        elem.title = name;
        elem.time = elem.time || '';
        elem.info = info.join('<span class="online-prestige-split">●</span>');
        var item = Lampa.Template.get('lampac_prestige_folder', elem);
        if (elem.img) {
          var image = $('<img style="height: 7em; width: 7em; border-radius: 0.3em;"/>');
          item.find('.online-prestige__folder').empty().append(image);
          if (elem.img !== undefined) {
            if (elem.img.charAt(0) === '/') elem.img = Defined.localhost + elem.img.substring(1);
            if (elem.img.indexOf('/proxyimg') !== -1) elem.img = account(elem.img); 
          }
          Lampa.Utils.imgLoad(image, elem.img);
        }
        item.on('hover:enter', function() {
          _this6.reset();
          _this6.request(elem.url);
        }).on('hover:focus', function(e) {
          last = e.target;
          scroll.update($(e.target), true);
        });
        scroll.append(item);
      });
      Lampa.Controller.enable('content');
      this.loading(false);
    };
    /**
     * Возвращает текущий выбор сезона/перевода
     * @param {string} balanser 
     * @returns 
     */
    this.getChoice = function(balanser) {
      var bal = balanser || this.getLastChoiceBalanser();
      var name = 'online_choice_' + bal;
      var choice = Lampa.Storage.cache(name, 5000, {});
      if (!Lampa.Arrays.isObject(choice)) choice = {};
      if (typeof choice.season == 'undefined') choice.season = 0;
      if (typeof choice.voice == 'undefined') choice.voice = 0;
      if (typeof choice.voice_url == 'undefined') choice.voice_url = '';
      if (typeof choice.voice_name == 'undefined') choice.voice_name = '';
      if (typeof choice.episodes_view == 'undefined') choice.episodes_view = {};
      if (typeof choice.movie_view == 'undefined') choice.movie_view = '';
      if (typeof choice.voice_id == 'undefined') choice.voice_id = '';
      return choice;
    };
    /**
     * Сохраняет выбор сезона/перевода
     * @param {*} choice 
     * @param {string} balanser 
     */
    this.saveChoice = function(choice, balanser) {
      var bal = balanser || this.getLastChoiceBalanser();
      var name = 'online_choice_' + bal;
      Lampa.Storage.set(name, choice);
    };
    /**
     * Сбросить выбор сезона/перевода
     */
    this.replaceChoice = function(choice, balanser) {
      var current = this.getChoice(balanser);
      for (var i in choice) {
        current[i] = choice[i];
      }
      this.saveChoice(current, balanser);
    };
    /**
     * Установить фильтр
     * @param {*} filter_items 
     * @param {*} choice 
     */
    this.filter = function(filter_items, choice) {
      var select = [];
      var add = function add(type, title) {
        var items = filter_items[type].map(function(e) {
          return e.title;
        });
        var value = choice[type];
        if (value > items.length - 1) value = 0;
        choice[type] = value;
        var subitems = items.map(function(name, i) {
          return {
            title: name,
            selected: value == i,
            index: i
          };
        });
        select.push({
          title: title,
          subtitle: items[value],
          items: subitems,
          stype: type
        });
      };
      filter_items.source = filter_sources;
      select.push({
        title: Lampa.Lang.translate('torrent_parser_reset'),
        reset: true
      });
      this.saveChoice(choice);
      if (filter_items.voice && filter_items.voice.length) add('voice', Lampa.Lang.translate('torrent_parser_voice'));
      if (filter_items.season && filter_items.season.length) add('season', Lampa.Lang.translate('torrent_serial_season'));
      filter.set('filter', select);
      filter.set('sort', filter_sources.map(function(e) {
        return {
          title: sources[e].name,
          source: e,
          selected: e == balanser,
          ghost: !sources[e].show
        };
      }));
      this.selected(filter_items);
    };
    /**
     * Показать что выбрано в фильтре
     */
    this.selected = function(filter_items) {
      var need = this.getChoice(),
        select = [];
      for (var i in need) {
        if (filter_items[i] && filter_items[i].length) {
          if (i == 'voice') {
            select.push(filter_translate[i] + ': ' + filter_items[i][need[i]].title);
          } else if (i !== 'source') {
            if (filter_items.season.length >= 1) {
              select.push(filter_translate.season + ': ' + filter_items[i][need[i]].title);
            }
          }
        }
      }
      filter.chosen('filter', select);
      filter.chosen('sort', [sources[balanser].name]);
    };
    this.getEpisodes = function(season, call) {
      var episodes = [];
      var tmdb_id = object.movie.id;
      if (['cub', 'tmdb'].indexOf(object.movie.source || 'tmdb') == -1) tmdb_id = object.movie.tmdb_id;
      if (tmdb_id && object.movie.name) {
        network["native"]('https://api.themoviedb.org/3/tv/' + tmdb_id + '/season/' + season + '?api_key=4226d9c2288168a68b446a0642735706&language=' + Lampa.Storage.field('api_language'), function(json) {
          if (json.episodes) episodes = json.episodes;
          call(episodes);
        }, function() {
          call([]);
        });
      } else call([]);
    };
    /**
     * Отрисовка списка файлов
     * @param {*} items 
     * @param {*} params 
     */
    this.draw = function(items, params) {
      var _this7 = this;
      var scroll_to_mark = null;
      var scroll_to_element = null;
      var serial = !!object.movie.name;
      this.getEpisodes(items.length ? items[0].season : 0, function(episodes) {
        scroll.clear();
        items.forEach(function(element, index) {
          var _this8 = _this7;
          var data = element;
          var episode = episodes.length && !params.similars ? episodes.find(function(e) { return e.episode_number == element.episode; }) : false;
          var episode_num = element.episode ||
            index + 1;
          var episode_last = choice.episodes_view[element.season];
          var voice_name = choice.voice_name || (filter_find.voice[0] ? filter_find.voice[0].title : false) || element.voice_name ||
            (serial ? 'Неизвестно' : element.text) || 'Неизвестно';
          if (element.quality) {
            element.qualitys = element.quality;
            element.quality = Lampa.Arrays.getKeys(element.quality)[0];
          }
          Lampa.Arrays.extend(element, { voice_name: voice_name, info: voice_name.length > 60 ? voice_name.substr(0, 60) + '...' : voice_name, quality: '', time: Lampa.Utils.secondsToTime((episode ? episode.runtime : object.movie.runtime) * 60, true) });
          var hash_timeline = Lampa.Utils.hash(element.season ? [element.season, element.season > 10 ? ':' : '', element.episode, object.movie.original_title].join('') : object.movie.original_title);
          var hash_behold = Lampa.Utils.hash(element.season ? [element.season, element.season > 10 ? ':' : '', element.episode, object.movie.original_title, element.voice_name].join('') : object.movie.original_title + element.voice_name);
          var data = { hash_timeline: hash_timeline, hash_behold: hash_behold };
          var info = [];
          if (element.season) {
            element.translate_episode_end = _this8.getLastEpisode(items);
            element.translate_voice = element.voice_name;
          }
          if (element.text && !episode) element.title = element.text;
          element.timeline = Lampa.Timeline.view(hash_timeline);
          if (episode) {
            element.title = episode.name;
            info.push(Lampa.Lang.translate('full_episode') + ' ' + episode_num);
            if (episode.air_date) info.push(episode.air_date.slice(0, 4));
            if (element.timeline.percent) element.info = Lampa.Utils.secondsToTime(element.timeline.time, true);
            else element.info = info.join('<span class="online-prestige-split">●</span>');
          } else if (element.season) {
            element.title = Lampa.Lang.translate('full_episode') + ' ' + episode_num;
            element.info = element.voice_name;
          }
          if (element.quality) element.info = element.quality + (element.info ? ' / ' + element.info : '');
          if (element.info) element.info = element.info.replace(' Неизвестно', '');
          element.mark = function() {
            var viewed = Lampa.Storage.cache('online_view', 5000, []);
            if (viewed.indexOf(hash_behold) == -1) {
              viewed.push(hash_behold);
              Lampa.Storage.set('online_view', viewed);
              Lampa.Storage.set('online_view_full', viewed);
              if (html.find('.online-prestige__viewed').length == 0) {
                html.find('.online-prestige__img').append('<div class="online-prestige__viewed">' + Lampa.Template.get('icon_viewed', {}, true) + '</div>');
              }
            }
            var choice = _this8.getChoice();
            if (!serial) {
              choice.movie_view = hash_behold;
            } else {
              choice.episodes_view[element.season] = episode_num;
            }
            _this8.saveChoice(choice);
            var voice_name_text = choice.voice_name ||
              element.voice_name || element.title;
            if (voice_name_text.length > 30) voice_name_text = voice_name_text.slice(0, 30) + '...';
            _this8.watched({ balanser: balanser, balanser_name: Lampa.Utils.capitalizeFirstLetter(sources[balanser] ? sources[balanser].name.split(' ')[0] : balanser), voice_id: choice.voice_id, voice_name: voice_name_text, episode: element.episode, season: element.season });
          };
          element.unmark = function() {
            var viewed = Lampa.Storage.cache('online_view', 5000, []);
            if (viewed.indexOf(hash_behold) !== -1) {
              Lampa.Arrays.remove(viewed, hash_behold);
              Lampa.Storage.set('online_view', viewed);
              Lampa.Storage.remove('online_view', hash_behold);
              html.find('.online-prestige__viewed').remove();
            }
          };
          element.timeclear = function() {
            element.timeline.percent = 0;
            element.timeline.time = 0;
            element.timeline.duration = 0;
            Lampa.Timeline.update(element.timeline);
          };
          var html = Lampa.Template.get('lampac_prestige_list', element);
          var choice = _this8.getChoice();
          var is_viewed = serial ? choice.episodes_view[element.season] >= element.episode : choice.movie_view == hash_behold;
          var viewed = Lampa.Storage.cache('online_view', 5000, []);
          if (viewed.indexOf(hash_behold) !== -1 || is_viewed) {
            html.find('.online-prestige__img').append('<div class="online-prestige__viewed">' + Lampa.Template.get('icon_viewed', {}, true) + '</div>');
            html.find('.online-prestige__img').addClass('online-prestige__img--loaded');
            html.find('.online-prestige__folder').remove();
          }
          if (element.timeline && element.timeline.percent) {
            html.find('.online-prestige__title').append('<div class="online-prestige-line-indicator"><div class="online-prestige-line-indicator__line" style="width: ' + element.timeline.percent + '%"></div></div>');
          }
          if (serial && element.season && element.episode == episode_last) scroll_to_mark = html;
          if (element.timeline.percent > 0.95 && element.episode > episode_last && element.season == choice.season && serial) scroll_to_element = html;
          _this8.contextMenu({ element: element, html: html, data: data, call: params.onContextMenu });
          html.on('hover:enter', function() {
            if (object.movie.id) Lampa.Favorite.add('history', object.movie, 100);
            if (params.onEnter) params.onEnter(element, html, data);
          }).on('hover:focus', function(e) {
            last = e.target;
            if (params.onFocus) params.onFocus(element, html, data);
            scroll.update($(e.target), true);
          });
          if (params.onRender) params.onRender(element, html, data);
          scroll.append(html);
        });
        if (scroll_to_element) {
          last = scroll_to_element[0];
        } else if (scroll_to_mark) {
          last = scroll_to_mark[0];
        }
        Lampa.Controller.enable('content');
      });
    };
    /**
     * Меню
     */
    this.contextMenu = function(params) {
      params.html.on('hover:long', function() {
        function show(extra) {
          var enabled = Lampa.Controller.enabled().name;
          var menu = [];
          if (Lampa.Platform.is('webos')) {
            menu.push({
              title: Lampa.Lang.translate('player_lauch') + ' - Webos',
              player: 'webos'
            });
          }
          if (Lampa.Platform.is('android')) {
            menu.push({
              title: Lampa.Lang.translate('player_lauch') + ' - Android',
              player: 'android'
            });
          }
          menu.push({
            title: Lampa.Lang.translate('player_lauch') + ' - Lampa',
            player: 'lampa'
          });
          menu.push({
            title: Lampa.Lang.translate('lampac_video'),
            separator: true
          });
          menu.push({
            title: Lampa.Lang.translate('torrent_parser_label_title'),
            mark: true
          });
          menu.push({
            title: Lampa.Lang.translate('torrent_parser_label_cancel_title'),
            unmark: true
          });
          menu.push({
            title: Lampa.Lang.translate('time_reset'),
            timeclear: true
          });
          if (extra) {
            menu.push({
              title: Lampa.Lang.translate('copy_link'),
              copylink: true
            });
          }
          if (window.lampac_online_context_menu) window.lampac_online_context_menu.push(menu, extra, params);
          menu.push({
            title: Lampa.Lang.translate('more'),
            separator: true
          });
          if (Lampa.Account.logged() && params.element && typeof params.element.season !== 'undefined' && params.element.translate_voice) {
            menu.push({
              title: Lampa.Lang.translate('lampac_voice_subscribe'),
              subscribe: true
            });
          }
          menu.push({
            title: Lampa.Lang.translate('lampac_clear_all_marks'),
            clearallmark: true
          });
          menu.push({
            title: Lampa.Lang.translate('lampac_clear_all_timecodes'),
            clearalltime: true
          });
          Lampa.Controller.toggle('content');
          Lampa.Menu.open({
            title: params.element.title,
            items: menu,
            onSelect: function onSelect(a) {
              Lampa.Controller.toggle('content');
              if (a.mark) params.element.mark();
              if (a.unmark) params.element.unmark();
              if (a.timeclear) params.element.timeclear();
              if (a.copylink) Lampa.Utils.copyText(extra.file);
              if (a.player) Lampa.Player.run(extra.file, a.player);
              if (a.subscribe) _this.subscribeVoice(params.element);
              if (a.clearallmark) _this.clearAllMark();
              if (a.clearalltime) _this.clearAllTime();
            },
            onBack: function onBack() {
              Lampa.Controller.toggle('content');
            }
          });
        }
        if (Lampa.Controller.enabled().name !== 'content') return;
        Lampa.Controller.toggle('content_menu');
        if (params.onContextMenu) params.onContextMenu(params.element, params.html, params.data, show);
      });
    };
    this.subscribeVoice = function(element) {
      Lampa.Reguest.post(account(Defined.localhost + 'voice/subscribe'), {
        voice: element.translate_voice,
        id: object.movie.id,
        serial: object.movie.name ? 1 : 0
      }, function(a) {
        Lampa.Noty.show(Lampa.Lang.translate('lampac_voice_success'));
      }, function() {
        Lampa.Noty.show(Lampa.Lang.translate('lampac_voice_error'));
      }, {
        dataType: 'json'
      });
    };
    this.clearAllMark = function() {
      Lampa.Storage.remove('online_view');
      Lampa.Storage.remove('online_view_full');
      Lampa.Noty.show(Lampa.Lang.translate('lampac_voice_success'));
      Lampa.Activity.replace();
    };
    this.clearAllTime = function() {
      Lampa.Timeline.clear();
      Lampa.Noty.show(Lampa.Lang.translate('lampac_voice_success'));
      Lampa.Activity.replace();
    };
    this.watched = function(json) {
      Lampa.Reguest.post(account(Defined.localhost + 'voice/watched'), json, function() {}, function() {}, {
        dataType: 'json'
      });
    };
    this.noConnectToServer = function(er) {
      var _this9 = this;
      this.empty();
      Lampa.Controller.enabled().name;
      var html = Lampa.Template.get('lampac_empty', {
        text: Lampa.Lang.translate('lampac_balanser_dont_work'),
        title: Lampa.Lang.translate('lampac_balanser_timeout'),
        name: Lampa.Lang.translate('lampac_change_balanser'),
        icon: '&#57579;',
        balanser: balanser
      });
      if(er && er.accsdb) html.find('.online-empty__title').html(er.msg);
      var tic = er && er.accsdb ? 10 : 5;
      html.find('.cancel').on('hover:enter', function() {
        clearInterval(balanser_timer);
      });
      html.find('.change').on('hover:enter', function() {
        clearInterval(balanser_timer);
        filter.render().find('.filter--sort').trigger('hover:enter');
      });
      scroll.clear();
      scroll.append(html);
      this.loading(false);
      balanser_timer = setInterval(function() {
        tic--;
        html.find('.timeout').text(tic);
        if (tic == 0) {
          clearInterval(balanser_timer);
          var keys = Lampa.Arrays.getKeys(sources);
          var indx = keys.indexOf(balanser);
          var next = keys[indx + 1];
          if (!next) next = keys[0];
          balanser = next;
          if (Lampa.Activity.active().activity == _this9.activity) _this9.changeBalanser(balanser);
        }
      }, 1000);
    };
    this.getLastEpisode = function(items) {
      var last_episode = 0;
      items.forEach(function(e) {
        if (typeof e.episode !== 'undefined') last_episode = Math.max(last_episode, parseInt(e.episode));
      });
      return last_episode;
    };
    /**
     * Начать навигацию по файлам
     */
    this.start = function() {
      if (Lampa.Activity.active().activity !== this.activity) return;
      if (!initialized) {
        initialized = true;
        this.initialize();
      }
      Lampa.Background.immediately(Lampa.Utils.cardImgBackgroundBlur(object.movie));
      Lampa.Controller.add('content', {
        toggle: function toggle() {
          Lampa.Controller.collectionSet(scroll.render(), files.render());
          Lampa.Controller.collectionFocus(last || false, scroll.render());
        },
        gone: function gone() {}
      });
      Lampa.Controller.toggle('content');
    };
    this.empty = function() {
      this.noConnectToServer({
        accsdb: true,
        msg: Lampa.Lang.translate('lampac_does_not_answer_text')
      });
    };
    this.activity = object.activity;
  }

  function resetTemplates() {
    if (window.bwarch_template_reset) return;
    window.bwarch_template_reset = true;
    Lampa.Template.add('lampac_prestige_list', Lampa.Template.get('online_prestige_list'));
    Lampa.Template.add('lampac_prestige_folder', Lampa.Template.get('online_prestige_folder'));
    Lampa.Template.add('lampac_empty', Lampa.Template.get('online_empty'));
    Lampa.Template.add('lampac_content_loading', Lampa.Template.get('online_content_loading'));
  }

  function addSearch() {
    var source = {
      name: Lampa.Lang.translate('title_online'),
      handler: function handler(params, oncomplite) {
        var network = new Lampa.Reguest();
        var searchComplite = function searchComplite(json) {
          var links = [];
          if (json.data) {
            json.data.forEach(function(elem) {
              links.push(Lampa.Arrays.extend({
                title: elem.title,
                url: elem.url,
                balanser: elem.balanser
              }, elem));
            });
          }
          oncomplite(links);
        };
        var spiderUri = object.movie.name ? 'lite/serialsearch' : 'lite/moviesearch';
        network.timeout(5000);
        network.silent(account(Defined.localhost + spiderUri + '?title=' + params.query), function(json) {
          if (json.rch) {
            rchRun(json, function() {
              network.silent(account(Defined.localhost + 'lite/' + spiderUri + '?title=' + params.query), function(links) {
                searchComplite(links);
              }, function() {
                oncomplite([]);
              });
            });
          } else {
            searchComplite(json);
          }
        }, function() {
          oncomplite([]);
        });
      },
      onCancel: function() {
        network.clear()
      },
      params: {
        lazy: true,
        align_left: true,
        card_events: {
          onMenu: function() {}
        }
      },
      onMore: function(params, close) {
        close();
      },
      onSelect: function(params, close) {
        close();
        Lampa.Activity.push({
          url: params.element.url,
          title: 'Lampac - ' + params.element.title,
          component: 'bwarch',
          movie: params.element,
          page: 1,
          search: params.element.title,
          clarification: true,
          balanser: params.element.balanser,
          noinfo: true
        });
      }
    };
    Lampa.Search.addSource(source)
  }

  function startPlugin() {
    window.bwarch_plugin = true;
    var manifst = {
      type: 'video',
      version: '1.0', // ✅ Змінено на v1.0
      name: 'Ромашка', // ✅ Змінено на Ромашка
      description: 'By Ромашка v1.0', // ✅ Змінено на By Ромашка v1.0
      component: 'bwarch',
      onContextMenu: function onContextMenu(object) {
        return {
          name: Lampa.Lang.translate('lampac_watch'),
          description: ''
        };
      },
      onContextLauch: function onContextLauch(object) {
        resetTemplates();
        Lampa.Component.add('bwarch', component);
        var id = Lampa.Utils.hash(object.number_of_seasons ? object.original_name : object.original_title);
        var all = Lampa.Storage.get('clarification_search', '{}');
        Lampa.Activity.push({
          url: '',
          title: Lampa.Lang.translate('title_online'),
          component: 'bwarch',
          search: all[id] ? all[id] : object.title,
          search_one: object.title,
          search_two: object.original_title,
          movie: object,
          page: 1,
          clarification: all[id] ? true : false
        });
      }
    };
    Lampa.Manifest.plugins = manifst;
    
    // ✅ Залишено лише укр версію перекладу + внесення змін у текст
    Lampa.Lang.add({
      lampac_watch: {
        uk: 'Глянемо'
      }, // ✅ "Глянемо" замість "Дивитися онлайн"
      lampac_video: {
        uk: 'Відео'
      },
      lampac_no_watch_history: {
        uk: 'Немає історії перегляду'
      },
      lampac_nolink: {
        uk: 'Неможливо отримати посилання'
      },
      lampac_balanser: {
        uk: 'Звідкісь-береться'
      }, // ✅ "Источник" на "Звідкісь-береться"
      helper_online_file: {
        uk: 'Утримуйте клавішу "ОК" для виклику контекстного меню'
      },
      title_online: {
        uk: 'Онлайн'
      },
      lampac_voice_subscribe: {
        uk: 'Підписатися на переклад'
      },
      lampac_voice_success: {
        uk: 'Ви успішно підписалися'
      },
      lampac_voice_error: {
        uk: 'Виникла помилка'
      },
      lampac_video_stream: {
        uk: 'Відео-потік'
      },
      lampac_video_stream_error: {
        uk: 'Помилка отримання відео-потоку'
      },
      lampac_video_stream_text: {
        uk: 'Відео-потік'
      },
      lampac_clear_all_marks: {
        uk: 'Очистити всі мітки'
      },
      lampac_clear_all_timecodes: {
        uk: 'Очистити всі тайм-коди'
      },
      lampac_change_balanser: {
        uk: 'Змінити балансер'
      },
      lampac_balanser_dont_work: {
        uk: 'Пошук не дав результатів'
      },
      lampac_balanser_timeout: {
        uk: 'Джерело буде автоматично переключено через <span class="timeout">10</span> секунд.'
      },
      lampac_does_not_answer_text: {
        uk: 'Пошук не дав результатів'
      },
      torrent_serial_season: {
        uk: 'Сезончик™'
      }, // ✅ "Сезон" на "Сезончик™" (додано)
      torrent_parser_voice: {
        uk: 'Говорун-версія'
      }, // ✅ "Перевод" на "Говорун-версія" (додано)
      torrent_parser_reset: {
        uk: 'Скинути шмурдяк'
      } // ✅ "Сбросить фильтр" на "Скинути шмурдяк" (додано)
    });
    
    Lampa.Template.add('lampac_css', "\n <style>\n @charset 'UTF-8';.online-prestige{position:relative;-webkit-border-radius:.3em;border-radius:.3em;background-color:rgba(0,0,0,0.3);display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex}.online-prestige__body{padding:1.2em;line-height:1.3;-webkit-box-flex:1;-webkit-flex-grow:1;-moz-box-flex:1;-ms-flex-positive:1;flex-grow:1;position:relative}@media screen and (max-width:480px){.online-prestige__body{padding:.8em 1.2em}}.online-prestige__img{position:relative;width:13em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;min-height:8.2em}.online-prestige__img>img{position:absolute;top:0;left:0;width:100%;height:100%;-o-object-fit:cover;object-fit:cover;-webkit-border-radius:.3em;border-radius:.3em;opacity:0;-webkit-transition:opacity .3s;-o-transition:opacity .3s;-moz-transition:opacity .3s;transition:opacity .3s}.online-prestige__img--loaded>img{opacity:1}@media screen and (max-width:480px){.online-prestige__img{width:7em;min-height:6em}}.online-prestige__folder{padding:1em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0}.online-prestige__folder>svg{width:4.4em !important;height:4.4em !important}.online-prestige__viewed{position:absolute;top:1em;left:1em;background:rgba(0,0,0,0.45);-webkit-border-radius:100%;border-radius:100%;padding:.25em;font-size:.76em}.online-prestige__viewed>svg{width:1.5em !important;height:1.5em !important}.online-prestige__episode-number{position:absolute;top:0;left:0;right:0;bottom:0;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-webkit-justify-content:center;-moz-box-pack:center;-ms-flex-pack:center;justify-content:center;font-size:2em}.online-prestige__loader{position:relative}.online-prestige-line-indicator{background-color:#444;height:.15em;width:100%;position:absolute;bottom:0;left:0;overflow:hidden}.online-prestige-line-indicator__line{-webkit-border-radius:.15em;border-radius:.15em;background-color:#fff;height:.15em;position:absolute;top:0;left:0}.online-prestige-watched{padding:0!important}.online-prestige-watched__icon{width:4em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;position:relative;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-pack:center;-webkit-justify-content:center;-moz-box-pack:center;-ms-flex-pack:center;justify-content:center;-webkit-box-align:center;-webkit-align-items:center;-moz-box-align:center;-ms-flex-align:center;align-items:center}.online-prestige-watched__icon>svg{width:2em !important;height:2em !important}.online-prestige-watched.online-prestige:hover .online-prestige__body{padding:1.2em 1em 1.2em 0}@media screen and (max-width:480px){.online-prestige-watched__icon{width:3em}.online-prestige-watched__icon>svg{width:1.5em !important;height:1.5em !important}.online-prestige-watched.online-prestige:hover .online-prestige__body{padding:.8em 1em .8em 0}}.online-prestige__head{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-pack:justify;-webkit-justify-content:space-between;-moz-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;-webkit-box-align:start;-webkit-align-items:flex-start;-moz-box-align:start;-ms-flex-align:start;align-items:flex-start}.online-prestige__title{-webkit-box-flex:1;-webkit-flex-grow:1;-moz-box-flex:1;-ms-flex-positive:1;flex-grow:1;font-weight:700}.online-prestige__time{margin-left:.5em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0;opacity:.6;white-space:nowrap}.online-prestige__footer{opacity:.6;font-size:.8em}.online-prestige__folder .icon-folder{width:3.3em;height:3.3em}</style>\n ");
    Lampa.Template.add('lampac_prestige_list', "<div class=\"online-prestige online-prestige-list selector\">\n <div class=\"online-prestige__img\">\n <div class=\"online-prestige__folder\">\n <svg width=\"21\" height=\"21\" viewBox=\"0 0 21 21\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n <path d=\"M10.5 10.5C7.2015 10.5 4.5 13.2015 4.5 16.5H16.5C16.5 13.2015 13.7985 10.5 10.5 10.5Z\" fill=\"currentColor\"/>\n <path d=\"M10.5 9C12.433 9 14 7.433 14 5.5C14 3.567 12.433 2 10.5 2C8.567 2 7 3.567 7 5.5C7 7.433 8.567 9 10.5 9Z\" fill=\"currentColor\"/>\n </svg>\n </div>\n <div class=\"online-prestige__episode-number\">{episode}</div>\n </div>\n <div class=\"online-prestige__body\">\n <div class=\"online-prestige__head\">\n <div class=\"online-prestige__title\">{title}</div>\n <div class=\"online-prestige__time\">{time}</div>\n </div>\n\n <div class=\"online-prestige__footer\">\n <div class=\"online-prestige__info\">{info}</div>\n </div>\n </div>\n </div>");
    Lampa.Template.add('lampac_prestige_folder', "<div class=\"online-prestige online-prestige-folder selector\">\n <div class=\"online-prestige__img\">\n <div class=\"online-prestige__folder\">\n <svg width=\"21\" height=\"21\" viewBox=\"0 0 21 21\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n <path d=\"M10.5 10.5C7.2015 10.5 4.5 13.2015 4.5 16.5H16.5C16.5 13.2015 13.7985 10.5 10.5 10.5Z\" fill=\"currentColor\"/>\n <path d=\"M10.5 9C12.433 9 14 7.433 14 5.5C14 3.567 12.433 2 10.5 2C8.567 2 7 3.567 7 5.5C7 7.433 8.567 9 10.5 9Z\" fill=\"currentColor\"/>\n </svg>\n </div>\n </div>\n <div class=\"online-prestige__body\">\n <div class=\"online-prestige__head\">\n <div class=\"online-prestige__title\">{title}</div>\n <div class=\"online-prestige__time\">{time}</div>\n </div>\n\n <div class=\"online-prestige__footer\">\n <div class=\"online-prestige__info\">{info}</div>\n </div>\n </div>\n </div>");
    Lampa.Template.add('lampac_prestige_watched', "<div class=\"online-prestige online-prestige-watched selector\">\n <div class=\"online-prestige-watched__icon\">\n <svg width=\"21\" height=\"21\" viewBox=\"0 0 21 21\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n <circle cx=\"10.5\" cy=\"10.5\" r=\"9\" stroke=\"currentColor\" stroke-width=\"3\"/>\n <path d=\"M14.8477 10.5628L8.20312 14.399L8.20313 6.72656L14.8477 10.5628Z\" fill=\"currentColor\"/>\n </svg>\n </div>\n <div class=\"online-prestige__body\">\n <div class=\"online-prestige__head\">\n <div class=\"online-prestige__title\">{title}</div>\n <div class=\"online-prestige__time\">{time}</div>\n </div>\n\n <div class=\"online-prestige__footer\">\n <div class=\"online-prestige__info\">{info}</div>\n </div>\n </div>\n </div>");
    Lampa.Template.add('lampac_empty', '<div class="online-empty"><div class="online-empty__body"><div class="online-empty__icon"><svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/></svg></div><div class="online-empty__title">{text}</div><div class="online-empty__title">{title}</div><div class="online-empty__title"><span class="change selector" data-balanser="{balanser}">- {name} -</span> <span class="cancel selector" style="margin-left: 1em">- ' + Lampa.Lang.translate('cancel') + ' -</span></div></div></div>');
    Lampa.Template.add('lampac_content_loading', '<div class="online-loading"><div class="online-loading__body"><div class="online-loading__icon"><svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.5 4.5V1.5C10.5 1.34087 10.4368 1.18826 10.3232 1.07469C10.2097 0.961121 10.0571 0.897864 9.89798 0.897864C9.73886 0.897864 9.58625 0.961121 9.47268 1.07469C9.35911 1.18826 9.29585 1.34087 9.29585 1.5V4.5C9.29585 4.65913 9.35911 4.81174 9.47268 4.92531C9.58625 5.03888 9.73886 5.10214 9.89798 5.10214C10.0571 5.10214 10.2097 5.03888 10.3232 4.92531C10.4368 4.81174 10.5 4.65913 10.5 4.5ZM10.5 19.5V16.5C10.5 16.3409 10.4368 16.1883 10.3232 16.0747C10.2097 15.9611 10.0571 15.8979 9.89798 15.8979C9.73886 15.8979 9.58625 15.9611 9.47268 16.0747C9.35911 16.1883 9.29585 16.3409 9.29585 16.5V19.5C9.29585 19.6591 9.35911 19.8117 9.47268 19.9253C9.58625 20.0389 9.73886 20.1021 9.89798 20.1021C10.0571 20.1021 10.2097 20.0389 10.3232 19.9253C10.4368 19.8117 10.5 19.6591 10.5 19.5ZM17.1558 5.48839C17.0423 5.37482 16.8897 5.31156 16.7306 5.31156C16.5714 5.31156 16.4188 5.37482 16.3053 5.48839L14.127 7.66679C14.0134 7.78036 13.9502 7.93297 13.9502 8.09209C13.9502 8.25122 14.0134 8.40383 14.127 8.5174C14.2406 8.63097 14.3932 8.69423 14.5523 8.69423C14.7114 8.69423 14.864 8.63097 14.9776 8.5174L17.1558 6.33912C17.3829 6.11204 17.3829 5.71548 17.1558 5.48839ZM6.33912 17.1558C6.11204 17.3829 5.71548 17.3829 5.48839 17.1558L3.31009 14.9776C3.08301 14.7505 3.08301 14.3539 3.31009 14.1268C3.42366 14.0133 3.57627 13.9501 3.73539 13.9501C3.89452 13.9501 4.04713 14.0133 4.1607 14.1268L6.33912 16.3053C6.5662 16.5323 6.5662 16.9289 6.33912 17.1558ZM19.5 11.7041H16.5C16.3409 11.7041 16.1883 11.6409 16.0747 11.5273C15.9611 11.4137 15.8979 11.2611 15.8979 11.102C15.8979 10.9429 15.9611 10.7903 16.0747 10.6767C16.1883 10.5632 16.3409 10.5 16.5 10.5H19.5C19.6591 10.5 19.8117 10.5632 19.9253 10.6767C20.0389 10.7903 20.1021 10.9429 20.1021 11.102C20.1021 11.2611 20.0389 11.4137 19.9253 11.5273C19.8117 11.6409 19.6591 11.7041 19.5 11.7041ZM4.5 11.7041H1.5C1.34087 11.7041 1.18826 11.6409 1.07469 11.5273C0.961121 11.4137 0.897864 11.2611 0.897864 11.102C0.897864 10.9429 0.961121 10.7903 1.07469 10.6767C1.18826 10.5632 1.34087 10.5 1.5 10.5H4.5C4.65913 10.5 4.81174 10.5632 4.92531 10.6767C5.03888 10.7903 5.10214 10.9429 5.10214 11.102C5.10214 11.2611 5.03888 11.4137 4.92531 11.5273C4.81174 11.6409 4.65913 11.7041 4.5 11.7041ZM17.1558 17.1558C16.9288 17.3829 16.5322 17.3829 16.3051 17.1558L14.1268 14.9776C13.8997 14.7505 13.8997 14.3539 14.1268 14.1268C14.2403 14.0133 14.393 13.9501 14.5521 13.9501C14.7112 13.9501 14.8638 14.0133 14.9774 14.1268L17.1558 16.3051C17.3829 16.5322 17.3829 16.9288 17.1558 17.1558ZM6.33912 5.48839C6.11204 5.71548 6.11204 6.11204 6.33912 6.33912L8.5174 8.5174C8.63097 8.63097 8.78358 8.69423 8.94271 8.69423C9.10183 8.69423 9.25444 8.63097 9.36801 8.5174C9.5951 8.29031 9.5951 7.89375 9.36801 7.66667L7.18961 5.48839C6.96253 5.26131 6.56598 5.26131 6.33912 5.48839Z" fill="currentColor"/></svg></div><div class="online-loading__title">' + Lampa.Lang.translate('loading') + '</div></div></div>');
  }

  if (Lampa.Platform.is('webos') && typeof NativeWsClient == 'undefined') {
    Lampa.Utils.putScript(["https://rc.bwa.to/js/nws-client-es5.js?v18112025"], function() {}, false, function() {
      addSearch();
      startPlugin();
    }, true);
  } else {
    addSearch();
    startPlugin();
  }

  if (Lampa.Manifest.app_digital >= 177) {
    var balansers_sync = ["filmix", 'filmixtv', "fxapi", "rezka", "rhsprem", "lumex", "videodb", "collaps", "collaps-dash", "hdvb", "zetflix", "kodik", "ashdi", "kinoukr", "kinotochka", "remux", "iframevideo", "cdnmovies", "anilibria", "animedia", "animego", "animevost", "animebesst", "redheadsound", "alloha", "animelib", "moonanime", "vibix", "vdbmovies", "fancdn", "cdnvideohub", "vokino", "rc/filmix", "rc/fxapi", "rc/rhs", "vcdn", "vdb"]; // ✅ Видалено "kinopub"

    Lampa.Listener.follow('full', function(e) {
      if (e.type == 'complite' && e.data.movie && balansers_sync.indexOf(e.data.movie.source) !== -1) {
        if (e.data.movie.source != 'tmdb') {
          var bal = Lampa.Storage.get('online_balanser', '');
          if (bal) Lampa.Activity.replace({
            balanser: bal
          });
        }
      }
    });

    function addButton(e) {
      var btn = Lampa.Template.get('button', {
        title: Lampa.Lang.translate('lampac_watch')
      });
      btn.find('button').on('hover:enter', function() {
        Lampa.Component.add('bwarch', component);
        Lampa.Activity.push({
          url: '',
          title: Lampa.Lang.translate('title_online'),
          component: 'bwarch',
          movie: e.movie,
          page: 1
        });
      });
      e.render.after(btn);
    }
    Lampa.Listener.follow('full', function(e) {
      if (e.type == 'complite') {
        addButton({
          render: e.object.activity.render().find('.view--torrent'),
          movie: e.data.movie
        });
      }
    });
    try {
      if (Lampa.Activity.active().component == 'full') {
        addButton({
          render: Lampa.Activity.active().activity.render().find('.view--torrent'),
          movie: Lampa.Activity.active().card
        });
      }
    } catch (e) {}
  }
})();
