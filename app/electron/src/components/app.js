/**
 * @author oldj
 * @blog http://oldj.net
 */

'use strict';

import React from 'react';
import Panel from './panel/panel';
import Content from './content/content';
import SudoPrompt from './frame/sudo';
import EditPrompt from './frame/edit';
import './app.less';

class App extends React.Component {
    constructor(props) {
        super(props);

        let _data = SH_Agent.getHosts();

        this.state = {
            hosts: _data,
            current: _data.sys
        };

        // auto check refresh
        setTimeout(() => {
            this.autoCheckRefresh();
        }, 1000 * 5);

        SH_event.on('after_apply', () => {
            if (this.state.current.is_sys) {
                // 重新读取
                this.setState({
                    current: SH_Agent.getSysHosts()
                });
            }
        });

        ipcRenderer.on('to_import', (e, fn) => {
            SH_Agent.readFile(fn, (err, cnt) => {
                if (err) {
                    alert(err.message || 'Import Error!');
                    return;
                }
                let data;
                try {
                    data = JSON.parse(cnt);
                } catch (e) {
                    console.log(e);
                    alert(e.message || 'Bad format, the import file should be a JSON file.');
                    return;
                }

                if (!data.list || !Array.isArray(data.list)) {
                    alert('Bad format, the data JSON should have a [list] field.');
                    return;
                }

                this.setState({
                    hosts: Object.assign({}, this.state.hosts, {list: data.list})
                }, () => {
                    SH_event.emit('imported');
                });
                console.log('imported.');
            })
        });
    }

    autoCheckRefresh() {
        this.state.hosts.list.map((host, idx) => {
            setTimeout(() => {
                SH_event.emit('check_host_refresh', host);
            }, 1000 * 5 * idx);
        });

        setTimeout(() => {
            this.autoCheckRefresh();
        }, 1000 * 60 * 10);
    }

    setCurrent(host) {
        this.setState({
            current: host.is_sys ? SH_Agent.getSysHosts() : host
        });
    }

    static isReadOnly(host) {
        return host.is_sys || host.where == 'remote';
    }

    toSave() {
        clearTimeout(this._t);

        this._t = setTimeout(() => {
            SH_event.emit('change');
        }, 1000);
    }

    setHostContent(v) {
        if (this.state.current.content == v) return; // not changed

        this.state.current.content = v || '';
        this.toSave();
    }

    componentDidMount() {
    }

    render() {
        let current = this.state.current;
        return (
            <div id="app">
                <Panel hosts={this.state.hosts} current={current} setCurrent={this.setCurrent.bind(this)}/>
                <Content current={current} readonly={App.isReadOnly(current)}
                         setHostContent={this.setHostContent.bind(this)}/>
                <div className="frames">
                    <SudoPrompt/>
                    <EditPrompt/>
                </div>
            </div>
        );
    }
}

export default App;
