function DEFINE_NEW_RES(varname) {
	return `typeof ${varname} === "object" ? (Array.isArray(${varname}) ? [] : (${varname} === null ? null : {}) ) : ${varname}`
}

function performSingle(past, key, flexOptions = {}) {
  let src = past.src;
	let path = past.path;
	
	//console.log(key);
	
  src = src.replace(
    "/*$$CURRENT$$*/",
    `
		let data_${path.join("_")}_${key} = data_${path.join("_")}[${key}];
		let res_${path.join("_")}_${key} = ${DEFINE_NEW_RES( "data_"+path.join("_")+"_"+key )}
		/*$$CURRENT$$*/
		res_${path.join("_")}[${key}] = res_${path.join("_")}_${key}
	`
	);
	
	past.src = src;
	past.path.push(key);
	
	return past;
}

function performAll(past, flexOptions = {}) {
  let src = past.src;
	let path = past.path;
	
  src = src.replace(
    "/*$$CURRENT$$*/",
    `
		for(let key_${path.join("_")}_$ in data_${path.join("_")}) {
			let data_${path.join("_")}_$ = data_${path.join("_")}[key_${path.join("_")}_$];
			let res_${path.join("_")}_$ = ${DEFINE_NEW_RES( "data_"+path.join("_")+"_$" )}
			/*$$CURRENT$$*/
			res_${path.join("_")}[key_${path.join("_")}_$] = res_${path.join("_")}_$
		} 
	`
	);
	
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
					let res_ = ${DEFINE_NEW_RES("obj")}
					let data_ = obj
					/*$$CURRENT$$*/
					return res_;
				})
			`
		} //TO DO
	};
	return qlfn(new Proxy(ql, chomQL_proxyHandler(flexOptions)));
}

let a = [1,2,3];
let ql = chomQL($=>$.$);
//console.log(ql.$body.src)
console.log(eval(chomQL($=>$[0]).$body.src)(a));
