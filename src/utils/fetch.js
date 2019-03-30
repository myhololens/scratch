import nprogress from 'nprogress';


// Initial fetch
export default ({
    url = '',
    body = '',
    resp = 'JSON',
    method = 'POST',
    headers = { 'Authorization': localStorage['token'] || null },
}) => {


    // 请求地址
    if (url === '') {
        throw new Error('Interface url required. [for fetch.js]');
    }


    // 请求方式
    if (method.includes('GET')) {
        url += body; body = undefined;
    }

    if (method.includes('POST')) {
        body = JSON.stringify(body); headers['Content-Type'] = 'application/json';
    }

    if (method.includes('FORM')) {
        method = 'POST';
    }


    // 请求配置
    let opts = {
        body,
        method,
        headers,
        credentials: 'include',
    };


    return (
        fetch(
            addTimeStamp(url, nprogress.start()),
            opts,
        )

            .then(res => {
                opts.entries = res.headers.entries()
                nprogress.done()
                return (
                    res.status === 200 ? res[resp.toLowerCase()]() : Promise.reject('接口异常: ' + res.status)
                )
            })
            .then(res => {
                localStorage['debug'] && console.log(`%c${url}`, `color: #dd4b39`, res)
                return (
                    res
                )
            })
            .then(res => {
                if (resp.match(/json/i)) {
                    return res.status === 0 ? res.return : Promise.reject('接口异常')
                }
                if (resp.match(/blob/i)) {
                    for (let [key, value] of opts.entries) res[key] = decodeURIComponent(value)
                    return res
                }
            })
            .catch(ex => {
                return (
                    alert(typeof ex === 'object' ? ex.message : ex), !1
                )
            })
    );
};


function addTimeStamp(url) {
    return url + (url.includes('?') ? '&' : '?') + 'timestamp=' + Date.now();
}
