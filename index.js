//utils
function escapeRegExp(str) {
	return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function strReplaceAll(str, find, replace) {
	return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

function DEFINE_NEW_RES(varname) {
	return `typeof ${varname} === "object" ? (Array.isArray(${varname}) ? [] : (${varname} === null ? null : {}) ) : ${varname}`
}

function performSingle(past, key, flexOptions = {}) {
  let src = past.src;
	let path = past.path;
	let newPath = path.concat([key]);
	
	//console.log(key);
	
  // src = src.replace(
  //   "/*{{CURRENT}}*/",
  //   `
	// 	let data_${newPath.join("_")} = data_${path.join("_")}[${key}];
	// 	let res_${newPath.join("_")} = ${DEFINE_NEW_RES( "data_"+newPath.join("_") )}
	// 	/*{{CURRENT}}*/
	// 	res_${path.join("_")}[${key}] = res_${newPath.join("_")}
	// `
	// );

	src = strReplaceAll(src, "/*{{CURRENT}}*/",
		`
		{
			let data_parent = data_current
			let res_parent = res_current
			{
				let data_current = data_parent[${JSON.stringify(key)}];
				let res_current = ${DEFINE_NEW_RES( "data_current" )}
				/*{{CURRENT}}*/
				res_parent[${JSON.stringify(key)}] = res_current;
			}
		}
		`
	)
	
	past.src = src;
	past.path = newPath;
	
	return past;
}

function performAll(past, flexOptions = {}) {
  let src = past.src;
	let path = past.path;
	let newPath = path.concat(["$"]);
	
  //src = src.replace(
  //  "/*{{CURRENT}}*/",
	//	`
	//	for(let key_${newPath.join("_")} in data_${path.join("_")}) {
	//		let data_${newPath.join("_")} = data_${path.join("_")}[key_${newPath.join("_")}];
	//		let res_${newPath.join("_")} = ${DEFINE_NEW_RES( "data_"+newPath.join("_") )}
	//		/*{{CURRENT}}*/
	//		res_${path.join("_")}[key_${newPath.join("_")}] = res_${newPath.join("_")}
	//	} 
	//`
	//);

	src = strReplaceAll(src, "/*{{CURRENT}}*/",
		`
		for(let key_current in data_current) {
			let data_parent = data_current
			let res_parent = res_current
			{
				let data_current = data_parent[key_current];
				let res_current = ${DEFINE_NEW_RES( "data_current" )}
				/*{{CURRENT}}*/
				res_parent[key_current] = res_current;
			}
		}
		`
	)
	
	past.src = src;
	past.path = newPath;
	
	return past;
}

function performFinal(past, flexOptions = {}) {
  let src = past.src;
	let path = past.path;
	
  src = src.replace(
    "/*{{CURRENT}}*/",
    `
		res_current = data_current;
	`
	);
	
	//console.log(src);
	
	past.src = src;
	past.path.push("$");
	
	return past;
}

function chomQL_proxyHandler(flexOptions = {}) {
	let proxyHandler = {
		get(obj, key, receiver) {
			if (typeof key !== "string" && typeof key !== "number") return;
			if (key === "inspect") return;
			
			if (key == "$") {
				return new Proxy({
					$body: performAll(Reflect.get(obj, "$body"), flexOptions)
				}, proxyHandler);
			} else if (key[0] == "$") {
				if (key == "$final") {
					return new Proxy({
						$body: performFinal(Reflect.get(obj, "$body"), flexOptions)
					}, proxyHandler);
				}
				return Reflect.get(obj, key)
			} else {
				//console.log("Ddsadasd")
				return new Proxy({
					$body: performSingle(Reflect.get(obj, "$body"), key, flexOptions)
				}, proxyHandler);
			}
		}
	}
	
	return proxyHandler;
} 

function chomQL(qlfn, flexOptions = {}) {
	let ql = {
		$body: {
			path: [],
			src: `
				((obj) => {
					let res_current = ${DEFINE_NEW_RES("obj")}
					let data_current = obj
					/*{{CURRENT}}*/
					return res_current;
				})
			`
		} //TO DO
	};
	
	let proxy = new Proxy(ql, chomQL_proxyHandler(flexOptions));
	proxy = qlfn(proxy);
	proxy = proxy.$final;
	
	return proxy;
}

let a = [[1,8],[2,5],[3,9]];
let ql = chomQL($=>$.$);
//console.log(ql)
//console.log(ql.$body.src)
console.log(eval(chomQL($=>$.$[0]).$body.src)(a));
