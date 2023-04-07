let executed = '';
setInterval(() => {
	const url = window.location.href;
	let match = url.match(/https:\/\/console\.mbaas\.nifcloud\.com\/#\/applications\/[a-zA-Z0-9]+\/datastore\.*/);
	if (match) {
		// データストア向けの処理
		if (executed === 'datastore') return;
		datastoreExtension();
		executed = 'datastore';
	}
	match = url.match(/https:\/\/console\.mbaas\.nifcloud\.com\/#\/applications\/[a-zA-Z0-9]+\/user.*/);
	if (match) {
		// 会員管理向けの処理
		if (executed === 'user') return;
		userExtension();
		executed = 'user';
	}
}, 1000);

const datastoreExtension = () => {
	const child = document.createElement('li');
	const button = document.createElement('button');
	button.className = 'btn';
	button.innerHTML = '<span class="icon left download"></span> <span class="text">エクスポート</span>';
	button.onclick = exportDataStore;
	child.className = 'item';
	child.appendChild(button);
	const list = document.querySelector('.left-item');
	list.appendChild(child);
};

const LIMIT = 1000;

const exportDataStore = async () => {
	const sessionToken = await getSessionId();
	const className = document.querySelector('.item-class-name h3').innerText;
	// TODO: 絞り込み対応
	const params = URLJS(window.location.href);
	let skip = 0;
	const results = await getDataStore(className, sessionToken, skip);
	for (let skip = LIMIT; skip < results.count; skip += LIMIT) {
		const ary = await getDataStore(className, sessionToken, skip);
		results.results = results.results.concat(ary.results);
	}
	delete results.count;
	const blob = new Blob([ JSON.stringify(results) ], {
		type:"text/csv"
	});
	const a = document.createElement('a');
	a.href = window.URL.createObjectURL(blob);
	a.download = `${className}.json`;
	a.click();
};

const getDataStore = async (className, sessionToken, skip) => {
	const appId = window.location.href.match(/https:\/\/console\.mbaas\.nifcloud\.com\/#\/applications\/(.*?)\/datastore.*/)[1];
	const url = `https://console.mbaas.api.nifcloud.com/2013-09-01/applications/${appId}/classes/${className}?limit=${LIMIT}&skip=${skip}&count=1`;
	const res = await fetch(url, {
		headers: {
			accept: "application/json",
    	"x-ncmb-devs-session-token": sessionToken,
  	},
  	method: "GET",
	});
	return res.json();
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
}

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
}