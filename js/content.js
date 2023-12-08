let executed = '';
setInterval(() => {
	const match = urlType();
	if (match === executed) return;
	switch (match) {
		case 'datastores':
			// データストア最初の表示
			datastoresExtension();
			break;
		case 'datastore':
			// データストア向けの処理
			datastoreExtension();
			break;
		case 'user':
			// 会員管理向けの処理
			userExtension();
			break;
		case 'file':
			// ファイルストア向けの処理
			fileExtension();
			break;
		case 'push':
			// プッシュ通知向けの処理
			pushExtension();
			break;
		case 'script':
			// スクリプト向けの処理
			scriptExtension();
			break;
	}
	executed = match;
}, 1000);

const urlType = () => {
	const url = URLJS(window.location.href);
	if (url.hash.match(/#\/applications\/[a-zA-Z0-9]+\/datastore\?.+/)) {
		return 'datastore';
	}
	if (url.hash.match(/#\/applications\/[a-zA-Z0-9]+\/datastore$/)) {
		return 'datastores';
	}
	if (url.hash.match(/#\/applications\/[a-zA-Z0-9]+\/user.*/)) {
		return 'user';
	}
	if (url.hash.match(/#\/applications\/[a-zA-Z0-9]+\/file.*/)) {
		return 'file';
	}
	if (url.hash.match(/#\/applications\/[a-zA-Z0-9]+\/push$/)) {
		return 'push';
	}
	if (url.hash.match(/#\/applications\/[a-zA-Z0-9]+\/customlogic.*/)) {
		return 'script';
	}
	return '';
}

const datastoresExtension = () => {
	addDataStoreAllExportButton();
};

const addDataStoreAllExportButton = () => {
	const title = document.querySelector('.app-menu-nav-title');
	title.innerHTML = `データストア <button class="btn green" id="datastore-all-export"><span class="icon left download"></span> エクスポート</button>`;
	document.querySelector('#datastore-all-export').onclick = dataStoreAllExport;
};

const dataStoreAllExport = async (e, skip = 0) => {
	const limit = 10;
	const path = `class?limit=${limit}&skip=${skip}&order=-defaultClassFlag,definitionClassName&where=%7B%22modifiableFlag%22:true,%22definitionClassName%22:%7B%22$nin%22:%5B%22user%22,%22push%22,%22push_open_state%22,%22file%22%5D%7D%7D`;
	const appId = getAppId();
	const sessionToken = await getSessionId();
	const url = `https://console.mbaas.api.nifcloud.com/2013-09-01/applications/${appId}/${path}`;
	const res = await fetch(url, {
		headers: {
			"Content-Type": "application/json",
			"x-ncmb-devs-session-token": sessionToken,
		},
		method: "GET",
	});
	const json = await res.json();
	for (const obj of json.results) {
		const className = obj.definitionClassName;
		const results = await getDataStoreRecords(className);
		const blob = new Blob([ JSON.stringify(results) ], {
			type:"text/json"
		});
		download(`${className}.json`, blob);
	}
	if (json.results.length === limit) {
		dataStoreAllExport(e, skip + limit);
	}
};

const datastoreExtension = () => {
	addDataStoreExportButton();
	addDeleteField();
	replacePointerView();
};

const classToPath = (className) => {
	if (className === 'user') return 'users';
	if (className === 'push') return 'push';
	if (className === 'role') return 'roles';
	if (className === 'installation') return 'installations';
	if (className === 'file') return 'files';
	return `classes/${className}`;
}

const replacePointerView = async () => {
	const appId = getAppId();
	const sessionToken = await getSessionId();
	$(document).on('mouseover', 'div.datastore-field-pointer', async function() {
		try {
			const params = JSON.parse($(this).next().text());
			const path = classToPath(params.className);
			const url = `https://console.mbaas.api.nifcloud.com/2013-09-01/applications/${appId}/${path}/${params.objectId}`;
			const res = await fetch(url, {
				headers: {
					"Content-Type": "application/json",
					"x-ncmb-devs-session-token": sessionToken,
				},
				method: "GET",
			});
			const json = await res.json();
			const html = ['<table>'];
			for (const key in json) {
				if (key === 'acl') continue;
				html.push(`<tr><th>${key}</th><td>${json[key] || ''}</td></tr>`);
			}
			html.push('</table>');
			$(this).next().html(html.join(''));
		} catch (e) {
		}
	});
};

const addDataStoreExportButton = () => {
	const child = document.createElement('li');
	const button = document.createElement('span');
	button.classList.add('btn', 'pulldown', 'blue');
	button.innerHTML = `<span class="text">
			<span class="icon left download"></span>エクスポート</span>
		</span>
		<span class="icon right arrow-down"></span>
		<span class="pulldown-content">
			<span class="pulldown-inner">
				<span class="pulldown-item json">
					<a href="#" class="json">JSON</a>
				</span>
				<span class="pulldown-item">
					<a href="#" class="csv">CSV</a>
				</span>
			</span>
	</span>`;
	/*
	button.onclick = () => {
		button.querySelector('.pulldown-content').style.display = 'block';
		// exportDataStore;
	}
	*/
	child.className = 'item';
	child.appendChild(button);
	const list = document.querySelector('.left-item');
	list.appendChild(child);
	button.querySelector('.json').onclick = exportDataStoreAsJson;
	button.querySelector('.csv').onclick = exportDataStoreAsCSV;
};

const addDeleteField = () => {
	window.addEventListener('keydown', async (e) => {
    if (document.activeElement !== document.body) return;
		if (e.keyCode !== 46) return;
		const field = document.querySelector('.datastore-cols-hilight');
		if (!field) return;
		const fieldName = field.getAttribute('data-field');
		const objectId = field.getAttribute('data-objectid');
		const className = field.getAttribute('data-classname');
		const appId = getAppId();
		const sessionToken = await getSessionId();
		const url = `https://console.mbaas.api.nifcloud.com/2013-09-01/applications/${appId}/classes/${className}/${objectId}`;
		await fetch(url, {
			headers: {
				"Content-Type": "application/json",
				"x-ncmb-devs-session-token": sessionToken,
			},
			body: JSON.stringify({[fieldName]: null}),
			method: "PUT",
		});
		document.querySelector('.app-action-reload').click();
  });
};

const LIMIT = 1000;

const exportDataStoreAsJson = async (e) => {
	e.preventDefault();
	const className = document.querySelector('.item-class-name h3').innerText;
	const results = await getDataStoreRecords(className);
	const blob = new Blob([ JSON.stringify(results) ], {
		type:"text/json"
	});
	download(`${className}.json`, blob);
};

const exportDataStoreAsCSV = async (e) => {
	e.preventDefault();
	const className = document.querySelector('.item-class-name h3').innerText;
	const { results } = await getDataStoreRecords(className);
	const csv = jsonToCsv(results);
	const blob = new Blob([ csv ], {
		type:"text/csv"
	});
	download(`${className}.csv`, blob);
}

function jsonToCsv(ary) {
	const headers = new Set;
	for (const row of ary) {
		for (const key of Object.keys(row)) {
			headers.add(key);
		}
	}
	const rows = [];
	for (const row of ary) {
		const params = [];
		for (const header of headers) {
			params.push(escapeCsvValue(row[header]));
		}
		rows.push(params.join(','));
	}
  const header = Array.from(headers).join(',');
  return `${header}\n${rows.join('\n')}`;
}

const escapeCsvValue = (value) => {
	if (typeof value === 'number') {
		return value;
	}
  if (typeof value === 'object') {
		if (!value) return '';
		if (value.__type && value.__type === 'Date') {
			value = value.iso;
		} else if (value.__type && value.__type === 'GeoPoint') {
			value = JSON.stringify({
				latitude: value.latitude,
				longitude: value.longitude,
			});
		} else {
			value = JSON.stringify(value);
		}
  }
  if (/[,"\n]/.test(value)) {
    value = `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const getDataStoreRecords = async (className) => {
	const sessionToken = await getSessionId();
	// TODO: 絞り込み対応
	const params = URLJS(window.location.href);
	let skip = 0;
	const results = await getDataStore(className, sessionToken, skip);
	for (let skip = LIMIT; skip < results.count; skip += LIMIT) {
		const ary = await getDataStore(className, sessionToken, skip);
		results.results = results.results.concat(ary.results);
	}
	delete results.count;
	return results;
};

const download = (filename, blob) => {
	const a = document.createElement('a');
	a.href = window.URL.createObjectURL(blob);
	a.download = filename;
	a.click();
};

const getUrl = (className, skip) => {
	const appId = getAppId();
	const baseUrl = `https://console.mbaas.api.nifcloud.com/2013-09-01/applications/${appId}`;
	if (className === 'installation') {
		return `${baseUrl}/installations?limit=${LIMIT}&skip=${skip}&count=1`;
	}
	return `${baseUrl}/classes/${className}?limit=${LIMIT}&skip=${skip}&count=1`
};

const getDataStore = async (className, sessionToken, skip) => {
	const url = getUrl(className, skip);
	const res = await fetch(url, {
		headers: {
			accept: "application/json",
			"x-ncmb-devs-session-token": sessionToken,
		},
		method: "GET",
	});
	return res.json();
};

const getAppId = () => {
	return window.location.href.match(/https:\/\/console\.mbaas\.nifcloud\.com\/#\/applications\/(.*?)\/.*/)[1];
};

const getSessionId = () => {
	return new Promise((resolve, reject) => {
		document.cookie.split(";").forEach((cookie) => {
			const [key, value] = cookie.split("=");
			if (key.trim() === 'session') {
				const json = JSON.parse(decodeURIComponent(value));
				resolve(json.sessionToken);
			}
		});
	});
};

const userExtension = () => {
	const child = document.createElement('li');
	const button = document.createElement('button');
	button.className = 'btn';
	button.textContent = 'エクスポート';
	button.onclick = () => {
	};
	child.className = 'item';
	child.appendChild(button);
	const list = document.querySelector('.right-item ul');
	list.appendChild(child);
};

const fileExtension = () => {
	downloadAllButton();
	addMimeTypeFilter();
	showPreviewMonitor('');
};

const addMimeTypeFilter = () => {
	const ref = document.querySelector('.sub-navigation .title');
	const parent = ref.parentNode;
	[{
		text: '画像',
		mime: 'image/',
	},
	{
		text: '動画',
		mime: 'video/',
	},
	{
		text: '音声',
		mime: 'audio/',
	},
	{
		text: 'テキスト',
		mime: 'text/',
	},
	].forEach((obj) => {
		const button = document.createElement('button');
		button.className = 'btn';
		button.innerHTML = `<span class="text">${obj.text}</span>`;
		button.onclick = () => {
			addFilter(obj.mime);
		};
		ref.appendChild(button);
	});
};

// フィルタリングを操作する
const addFilter = (text) => {
	document.querySelector('.sub-navigation a.btn').click();
	document.querySelectorAll('.sub-navigation form select:first-child option')[1].selected = true;
	document.querySelector('.sub-navigation form select').dispatchEvent(new Event('change'));
	document.querySelector('.sub-navigation form input').value = text;
	document.querySelector('.sub-navigation form input').dispatchEvent(new Event('input'));
	document.querySelectorAll('.sub-navigation form select:last-child option')[1].selected = true;
	document.querySelector('.sub-navigation form select:last-child').dispatchEvent(new Event('change'));
	document.querySelectorAll('.sub-navigation #narrowing a:last-child')[1].click();
};


const showPreviewMonitor = (fileName) => {
	setTimeout(() => {
		const dom = document.querySelector('.matrix-content .title');
		if (!dom) return;
		if (dom.innerText.trim() === '') return showPreviewMonitor(fileName);
		if (fileName === dom.innerText.trim()) return showPreviewMonitor(fileName);
		fileName = dom.innerText.trim();
		showPreview(fileName);
		showPreviewMonitor(fileName);
	}, 1000);
};

const showPreview = async (fileName) => {
	const dom = document.querySelector('.matrix-content .module02:last-child .module-content');
	if (!dom) return;
	const extented = dom.querySelector('.extented');
	if (extented) {
		extented.remove();
	}
	const mimeType = dom.querySelector('.controls-block:first-child').innerText.trim();
	if (!mimeType.match(/^image\//)) return;
	const blob = await getBlob(fileName);
	const url = URL.createObjectURL(blob);
	const div = document.createElement('div');
	div.classList.add('control-group', 'right-style', 'extented');
	div.innerHTML = `
		<div class="control-label ng-binding">プレビュー</div>
		<div class="controls">
			<div class="controls-block">
				<img src="${url}" style="max-width: 100%; max-height: 100%;">
			</div>
		</div>
	`;
	dom.appendChild(div);
};

const downloadAllButton = () => {
	const brother = document.querySelector('[href="#file-upload"]');
	const button = document.createElement('button');
	button.className = 'btn blue';
	button.innerHTML = '<span class="icon left download"></span> <span class="text">一括DL</span>';
	button.onclick = downloadAllFiles;
	brother.parentNode.insertBefore(button, brother);
};

const pushExtension = () => {
	addDownloadReportButton();
	// addCopyButton();
};

/*
const addCopyButton = (stop = false) => {
	const brother = document.querySelector('button.red');
	const li = document.createElement('li');
	li.classList.add('item');
	const button = document.createElement('button');
	button.classList.add('btn', 'green');
	button.innerHTML = `<span class="text">コピー</span>`;
	button.onclick = copyPush;
	li.appendChild(button);
	brother.parentNode.parentNode.insertBefore(li, brother.parentNode);
};

const copyPush = async () => {
	const objectId = document.querySelector('.controls span').innerText;
	console.log(objectId);
	const sessionToken = await getSessionId();
	const appId = getAppId();
	const res = await fetch(`https://console.mbaas.api.nifcloud.com/2013-09-01/applications/${appId}/push/${objectId}`, {
		headers: {
			'content-type': "application/json",
			"x-ncmb-devs-session-token": sessionToken,
		},
		method: "GET",
	});
	const old = await res.json();
	for (const key of ['objectId', 'deliveryNumber', 'deliveryPlanNumber', 'error', 'status', 'updateDate', 'createDate']) {
		delete old[key];
	}
	console.log(JSON.stringify(old));
	const res2 = await fetch(`https://console.mbaas.api.nifcloud.com/2013-09-01/applications/${appId}/push`, {
		headers: {
			'content-type': "application/json",
			"x-ncmb-devs-session-token": sessionToken,
		},
		method: "POST",
		body: JSON.stringify(old),
	});
	console.log(await res2.json());
};
*/

const addDownloadReportButton = () => {
	const brother = document.querySelector('.title a.btn');
	if (!brother) return;
	const button = document.createElement('button');
	button.classList.add('btn', 'pulldown', 'blue');
	button.innerHTML = `<span class="text">
		<span class="icon left download"></span>レポートDL</span>
	</span>
	<span class="icon right arrow-down"></span>
	<span class="pulldown-content">
		<span class="pulldown-inner">
			<span class="pulldown-item json">
				<a href="#" class="json">JSON</a>
			</span>
			<span class="pulldown-item">
				<a href="#" class="csv">CSV</a>
			</span>
		</span>
	</span>`;
	button.querySelector('.json').onclick = downloadReportJson;
	button.querySelector('.csv').onclick = downloadReportCsv;
	brother.parentNode.insertBefore(button, brother);
};

const downloadReport = async () => {
	const pushes = document.querySelectorAll('ul[ng-show="pushs"] li.ng-scope a');
	const appId  = getAppId();
	const sessionToken = await getSessionId();
	const objectIds = [];
	for (const push of pushes) {
		push.click();
		const objectId = document.querySelector('.controls span').innerText;
		objectIds.push(objectId);
	};
	const params = {
		objectId: {
			"$inArray": objectIds
		}
	};
	const url = `https://console.mbaas.api.nifcloud.com/2013-09-01/applications/${appId}/push?where=${encodeURIComponent(JSON.stringify(params))}`;
	const res = await fetch(url, {
		headers: {
			accept: "application/json",
			"x-ncmb-devs-session-token": sessionToken,
		},
		method: "GET",
	});
	const pushResults = (await res.json()).results;
	const promises = [];
	for (const push of pushResults) {
		const promise = new Promise(async (resolve, reject) => {
			const url = `https://console.mbaas.api.nifcloud.com/2013-09-01/applications/${appId}/push/${push.objectId}/openNumber`;
			const res = await fetch(url, {
				headers: {
					accept: "application/json",
					"x-ncmb-devs-session-token": sessionToken,
				},
				method: "GET",
			});
			push.report = await res.json();
			resolve();
		});
		promises.push(promise);
	}
	await Promise.all(promises);
	return pushResults;
};

const downloadReportJson = async (e) => {
	e.preventDefault();
	const pushResults = await downloadReport();
	const d = new Date;
	const fileName = `push-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}.json`;
	download(fileName, new Blob([ JSON.stringify(pushResults) ], {type: "application/json"}));
};

const downloadReportCsv = async (e) => {
	e.preventDefault();
	const pushResults = await downloadReport();
	pushResults.forEach((push) => {
		Object.keys(push.report).forEach((key) => {
			push[key] = report[key];
		});
		if (Object.keys(push.error).length === 0) delete push.error;
		delete push.report;
		delete push.acl;
	});
	const csv = jsonToCsv(pushResults);
	const d = new Date;
	const fileName = `push-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}.csv`;
	download(fileName, new Blob([ csv], {type: "text/csv"}));
}


// ファイルストアの一括DL
const downloadAllFiles = async (e, skip = 0, results = []) => {
	const limit = 1000;
	const appId = getAppId();
	const sessionToken = await getSessionId();
	const path = `https://console.mbaas.api.nifcloud.com/2013-09-01/applications/${appId}/files?limit=${limit}&skip=${skip}&order=-createDate`;
	const res = await fetch(path, {
		headers: {
			accept: "application/json",
			"x-ncmb-devs-session-token": sessionToken,
		},
		method: "GET",
	});
	const json = await res.json();
	results = results.concat(json.results);
	for (const file of json.results) {
		const blob = await getBlob(file.fileName);
		download(file.fileName, blob);
	}
	if (json.results.length === limit) {
		downloadAllFiles(e, skip + limit, results);
	} else {
		alert('一括DLが完了しました');
		download('files.json', new Blob([ JSON.stringify({ results }) ], {type: "application/json"}));
	}
};

const getBlob = async (fileName) => {
	const url = 'https://console.mbaas.nifcloud.com/api/download/file';
	const applicationId = getAppId();
	const sessionToken = await getSessionId();
	const params = {
		applicationId,
		encFileName: fileName,
		sessionToken,
	};
	const res = await fetch(url, {
		headers: {
			"content-type": "application/x-www-form-urlencoded",
		},
		body: Object.keys(params)
			.map((key, value) => `${key}=${encodeURI(params[key])}`)
			.join('&'),
		method: "POST",
	});
	return res.blob();
};

const scriptExtension = () => {
	waitUploadModal();
	addDownloadScriptButton();
	addLogExportButton();
};

const waitUploadModal = (stop = false) => {
	setTimeout(() => {
    const dom = document.querySelector("#file-update");
		if (!dom) return;
    if (dom.style.display !== 'none') {
			if (stop) {
				return waitUploadModal(stop);
			}
			// ここで処理
			const selector = "[name='change'][ng-value='true']";
			document.querySelector("[name='change'][ng-value='true']").checked = true;
			document.querySelector(selector).dispatchEvent(new Event('click'));
			waitUploadModal(true);
    } else {
			waitUploadModal(false);
		}
	}, 500);
};

const addDownloadScriptButton = () => {
	const parent = document.querySelector('.matrix-content .item-right');
	const button = document.createElement('button');
	button.className = 'btn blue';
	button.innerHTML = '<span class="icon left download"></span> <span class="text">DL</span>';
	button.onclick = downloadScript;
	parent.appendChild(button);
};

const addLogExportButton = (stop = false) => {
	setTimeout(() => {
    const dom = document.querySelector(".module-content.log");
		if (!dom) return;
    if (dom.style.display !== 'none') {
			if (stop) {
				return addLogExportButton(stop);
			}
			const parent = dom.querySelector('.btn.green').parentElement;
			const button = document.createElement('button');
			button.className = 'btn blue log-download';
			button.innerHTML = '<span class="icon left download"></span> <span class="text">ログDL</span>';
			button.onclick = downloadScriptLog;
			parent.appendChild(button);
			addLogExportButton(true);
		} else {
			const button = document.querySelector('button.log-download');
			if (button) button.remove();
			addLogExportButton(false);
		}
	}, 500);
};

const downloadScriptLog = async () => {
	const fileName = document.querySelector('.matrix-content .module-title .title').innerText.trim();
	const form = document.querySelector('#log-form')
	const formData = new FormData(form);
  const formParams = new URLSearchParams(formData);
	const queries = new URLSearchParams();
	const keys = {
		'log_limit': 'limit',
		'log_status': 'Status',
		'log_begin': 'begin',
		'log_end': 'end',
	};
	for (const key in keys) {
		if (formParams.get(key)) {
			queries.set(keys[key], formParams.get(key));
		}
	}
	const applicationId = getAppId();
	const sessionToken = await getSessionId();
	const url = `https://script-console.mbaas.api.nifcloud.com/2015-09-01/applications/${applicationId}/scriptLog/${fileName}?${queries.toString()}`;
	const res = await fetch(url, {
		headers: {
			"X-NCMB-Devs-Session-Token": sessionToken,
		},
		method: "GET",
	});
	const json = await res.json();
	const csv = jsonToCsv(json);
	const blob = new Blob([ csv ], {
		type:"text/csv"
	});
	download(`${fileName}.csv`, blob);
}

const downloadScript = async () => {
	const fileName = document.querySelector('.matrix-content .module-title .title').innerText.trim();
	const appId = getAppId();
	const url = `https://script-console.mbaas.api.nifcloud.com/2015-09-01/applications/${appId}/manageScript/${fileName}?content=true`;
	const sessionToken = await getSessionId();
	const res = await fetch(url, {
		headers: {
			accept: "application/json",
			"x-ncmb-devs-session-token": sessionToken,
		},
		method: "GET",
	});
	const json = await res.json();
	const type = json.Ext === 'json' ? 'application/json' : 'text/x-ruby';
	download(fileName, new Blob([ json.Content ], { type }));
};
