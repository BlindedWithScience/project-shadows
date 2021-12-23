let GL = null;
let DIRECTION_TO_FACE = null;

onload = () => {
	canvas = document.getElementById("CANVAS");
	canvas.height= 1000;
	canvas.width = 1000;
	GL = canvas.getContext("webgl2");
	
	DIRECTION_TO_FACE = {
    1: GL.TEXTURE_CUBE_MAP_POSITIVE_Z,
    2: GL.TEXTURE_CUBE_MAP_NEGATIVE_Z,
    3: GL.TEXTURE_CUBE_MAP_POSITIVE_X,
    4: GL.TEXTURE_CUBE_MAP_NEGATIVE_X,
    5: GL.TEXTURE_CUBE_MAP_POSITIVE_Y,
    6: GL.TEXTURE_CUBE_MAP_NEGATIVE_Y,
	};

	let angleX = 0;
    let tanY = 0;
    let angleY = 0;
    const camSpeed = 0.003;
    const camBoundY = 0.9;
    canvas.onclick = event => {
        canvas.requestPointerLock();
    };

    canvas.onmousemove = event => {
        if (document.pointerLockElement !== canvas) { return; }

        angleX += event.movementX*camSpeed;
        tanY -= event.movementY*camSpeed / camBoundY;
        if (tanY < -3) { tanY = -3; }
        else if (tanY > 3) { tanY = 3; }
        angleY = Math.atan(tanY) * camBoundY;
    };
	
	GL.enable(GL.DEPTH_TEST);
	GL.enable(GL.BLEND);
	GL.depthFunc(GL.LEQUAL);
	
	const lightSources = [
		{ x: -5, y: 7, z: -8, intensity: 15 },
		{ x: 0, y: 0, z: 5, intensity: 15 },
	];
	
	const lights = setupLights(lightSources);
	const cube = setupCube();
	
	const render = time => {
		let aspect = processResize();
		
		lights.sources = [
			{ x: -5 + Math.cos(time/1000) * 5, y: 7, z: -8, intensity: 15 },
			{ x: Math.sin(time/1000) * 5, y: Math.cos(time/2000) * 3, z: 5, intensity: 15 },

		];
		
		const cameraPos = [
            2*Math.sin(angleX)*Math.cos(angleY), 
            -2*Math.sin(angleY), 
            2*Math.cos(angleX)*Math.cos(angleY)
        ];
		
		GL.clearColor(0, 0, 0, 1);
		GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
		
		const cube1 = {
			size: 1,
			position: [Math.cos(time/1000) * 4, Math.sin(time/1000) * 4, 0],
			axis: [0, 1, 0],
			angle: time/1000,
			color: [0.1, 0.3, 0.6],
		}
		
		const cube2 = {
			size: 1,
			position: [0, Math.cos(time/1000) * 4, - Math.sin(time/1000) * 4],
			axis: [0, 1, 0],
			angle: time/1000,
			color: [0.6, 0.1, 0.3],
		}
		

		
		const room = {
			size: 15,
			position: [0, 0, 0],
			axis: [0, 1, 0],
			angle: 0,
			color: [0.5, 1, 0.5],
		}
		
		GL.blendFuncSeparate(GL.ONE, GL.ZERO, GL.ONE, GL.ZERO);
		drawShadowmaps(cube, lights, [cube1, cube2, room]);
		drawObjects(cube, aspect, cameraPos, lights, [cube1, cube2, room]);
		
		requestAnimationFrame(render);
	}

	render(0);
}




function drawShadowmaps(cube, lights, objects) {
    GL.bindFramebuffer(GL.FRAMEBUFFER, lights.framebuffer);
    GL.viewport(0, 0, lights.resolution, lights.resolution);
	

  
    for (let i = 0; i < lights.sources.length; i++) {
        const light = lights.sources[i];
        const shadowmap = lights.shadowmaps[i];

        for (let dir = 1; dir <= 6; dir++) {
			
			
			
            GL.framebufferTexture2D(GL.FRAMEBUFFER, GL.DEPTH_ATTACHMENT, DIRECTION_TO_FACE[dir], shadowmap, 0);
			//GL.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0, DIRECTION_TO_FACE[dir], shadowmap, 0);
			GL.clear(GL.DEPTH_BUFFER_BIT | GL.COLOR_BUFFER_BIT);
			
			
			for (const object of objects) {
				cube.beginShadow();
				GL.uniform3f(cube.shadowUniforms.camera_pos, 
					light.x, light.y, light.z);
				GL.uniform1i(cube.shadowUniforms.camera_dir, dir);
				GL.uniform1f(cube.shadowUniforms.size, object.size);
				GL.uniform3f(cube.shadowUniforms.position, ...object.position);
				GL.uniform3f(cube.shadowUniforms.axis, ...object.axis);
				GL.uniform1f(cube.shadowUniforms.angle, object.angle);
				cube.draw();
			}
        }
		/*
		if (i == 1) {
		dir = 1;
		GL.bindFramebuffer(GL.FRAMEBUFFER, null);
		GL.viewport(0, 0, GL.canvas.width, GL.canvas.height);
		GL.clear(GL.DEPTH_BUFFER_BIT | GL.COLOR_BUFFER_BIT);
		
		for (const object of objects) {
			cube.beginShadow();
			GL.uniform3f(cube.shadowUniforms.camera_pos, 
				light.x, light.y, light.z);
			GL.uniform1i(cube.shadowUniforms.camera_dir, dir);
			GL.uniform1f(cube.shadowUniforms.size, object.size);
			GL.uniform3f(cube.shadowUniforms.position, ...object.position);
			GL.uniform3f(cube.shadowUniforms.axis, ...object.axis);
			GL.uniform1f(cube.shadowUniforms.angle, object.angle);
			cube.draw();
		}}
		*/
    }

    GL.bindFramebuffer(GL.FRAMEBUFFER, null);
    GL.viewport(0, 0, GL.canvas.width, GL.canvas.height);
}


function drawObjects(cube, aspect, cameraPos, lights, objects) {
	
	for (let i = -1; i < lights.sources.length; i++) {
	for (const object of objects) {
        if (i == 0) {
            GL.blendFuncSeparate(GL.ONE, GL.ONE, GL.ZERO, GL.ONE);
        }

        const light = i < 0
            ? { x: 0, y: 0, z: 0, intensity: 0 } 
            : lights.sources[i];

        const shadowmap = i < 0
            ? null 
            : lights.shadowmaps[i];
		
			
			cube.beginSingleLight(light, shadowmap);
			GL.uniform1f(cube.singleLightUniforms.aspect, aspect);
			GL.uniform1f(cube.singleLightUniforms.size, object.size);
			GL.uniform3f(cube.singleLightUniforms.position, ...object.position);
			GL.uniform3f(cube.singleLightUniforms.axis, ...object.axis);
			GL.uniform1f(cube.singleLightUniforms.angle, object.angle);
			GL.uniform3f(cube.singleLightUniforms.color, ...object.color);
			GL.uniform3f(cube.singleLightUniforms.camera_pos, ...cameraPos);
			cube.draw();
			/*
			cube.begin();
			GL.uniform1f(cube.uniforms.aspect, aspect);
			GL.uniform1f(cube.uniforms.size, object.size);
			GL.uniform3f(cube.uniforms.position, ...object.position);
			GL.uniform3f(cube.uniforms.axis, ...object.axis);
			GL.uniform1f(cube.uniforms.angle, object.angle);
			GL.uniform3f(cube.uniforms.color, ...object.color);
			GL.uniform3f(cube.uniforms.camera_pos, ...cameraPos);
			cube.draw();
			*/
	}}
}


function setupCube() {
	const attribs = {
		coord: 0
	};
	
	
	
	const {program: shadowProgram, uniforms: shadowUniforms} = buildProgram(CUBE_VS, SHADOWMAP_FS, attribs,
		["size", "axis", "angle", "position", "aspect", "camera_dir", "camera_pos"]);

	const {
        program: singleLightProgram,
        uniforms: singleLightUniforms,
    } = buildProgram(CUBE_VS, SINGLE_LIGHT_CUBE_FS, attribs, [
        'camera_pos', 'camera_dir', 'aspect', 'size', 'light', 'shadowmap', 'color', 'axis', 'angle', 'position',		
    ]);
	
	const vao = createCubeVAO(attribs);

	
	
    const beginShadow = () => {
        GL.useProgram(shadowProgram);
        
        GL.bindVertexArray(vao);

		GL.uniform1f(shadowUniforms.aspect, 1);
    };


	const beginSingleLight = (light, shadowmap) => {
        GL.useProgram(singleLightProgram);
        
        GL.activeTexture(GL.TEXTURE0);
        GL.bindTexture(GL.TEXTURE_CUBE_MAP, shadowmap);

        GL.bindVertexArray(vao);

        GL.uniform1i(singleLightUniforms.shadowmap, 0);
        GL.uniform4f(singleLightUniforms.light, 
            light.x, light.y, light.z, light.intensity);
		GL.uniform1i(singleLightUniforms.camera_dir, 0);
    };


	const draw = () => {
		GL.drawArrays(GL.TRIANGLES, 0, 36);
	}

	return { shadowUniforms, singleLightUniforms, beginShadow, beginSingleLight, draw};
}


function setupLights(lightSources) {
    const lightsData = []; 
    const shadowmaps = [];
    const resolution = 1024;

	const framebuffer = GL.createFramebuffer();
	GL.bindFramebuffer(GL.FRAMEBUFFER, framebuffer);
	GL.viewport(0, 0, resolution, resolution);
	
	const depth = GL.createTexture();
	GL.bindTexture(GL.TEXTURE_2D, depth);
	GL.texStorage2D(GL.TEXTURE_2D, 1, GL.DEPTH_COMPONENT32F, resolution, resolution);
	GL.framebufferTexture2D(GL.FRAMEBUFFER, GL.DEPTH_ATTACHMENT, GL.TEXTURE_2D, depth, 0);
	

    for (const source of lightSources) {
        lightsData.push(source.x, source.y, source.z, source.intensity);
        
        const shadowmap = GL.createTexture();
        GL.bindTexture(GL.TEXTURE_CUBE_MAP, shadowmap);
        GL.texStorage2D(GL.TEXTURE_CUBE_MAP, 1, GL.DEPTH_COMPONENT32F, resolution, resolution);
		//GL.texStorage2D(GL.TEXTURE_CUBE_MAP, 1, GL.RGBA8, resolution, resolution);
        GL.texParameteri(GL.TEXTURE_CUBE_MAP, GL.TEXTURE_MIN_FILTER, GL.NEAREST);
		GL.texParameteri(GL.TEXTURE_CUBE_MAP, GL.TEXTURE_MAG_FILTER, GL.NEAREST);
        GL.texParameteri(GL.TEXTURE_CUBE_MAP, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE);
        GL.texParameteri(GL.TEXTURE_CUBE_MAP, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);
        GL.texParameteri(GL.TEXTURE_CUBE_MAP, GL.TEXTURE_WRAP_R, GL.CLAMP_TO_EDGE);
		
		for (let dir = 1; dir <= 6; dir++) {
			/*GL.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0,
                DIRECTION_TO_FACE[dir], shadowmap, 0);
			GL.clearColor(0.1, 0, 0, 1);
            GL.clear(GL.DEPTH_BUFFER_BIT | GL.COLOR_BUFFER_BIT);
            GL.framebufferTexture2D(GL.FRAMEBUFFER, GL.DEPTH_ATTACHMENT,
                DIRECTION_TO_FACE[dir], shadowmap, 0);
            GL.clear(GL.DEPTH_BUFFER_BIT);*/
		}

        shadowmaps.push(shadowmap);
    }
	
	GL.bindFramebuffer(GL.FRAMEBUFFER, null);
    GL.viewport(0, 0, GL.canvas.width, GL.canvas.height);

    return {
        sources: lightSources,
        shadowmaps,
        resolution,
        framebuffer,
    };
}


function createCubeVAO(attributes) {
	const vao = GL.createVertexArray();
	
	GL.bindVertexArray(vao);
	
	const buffer = GL.createBuffer();
	
	GL.bindBuffer(GL.ARRAY_BUFFER, buffer);
	GL.bufferData(GL.ARRAY_BUFFER, makeCube(), GL.STATIC_DRAW);
	
	const coord = attributes;

	GL.enableVertexAttribArray(coord);
	GL.vertexAttribPointer(coord, 3, GL.FLOAT, false, 0, 0);
	
	GL.bindVertexArray(null);
	
	return vao;
}


function makeCube() {
	const v0 = [-1, -1, -1];
	const v1 = [-1, -1,  1];
	const v2 = [-1,  1, -1];
	const v3 = [-1,  1,  1];
	const v4 = [1,  -1, -1];
	const v5 = [1,  -1,  1];
	const v6 = [1,   1, -1];
	const v7 = [1,   1,  1];

	return Float32Array.from(
		v0.concat(v1).concat(v2)
		.concat(v1).concat(v2).concat(v3)
		.concat(v0).concat(v1).concat(v4)
		.concat(v1).concat(v4).concat(v5)
		.concat(v0).concat(v2).concat(v4)
		.concat(v2).concat(v4).concat(v6)
		.concat(v7).concat(v3).concat(v6)
		.concat(v3).concat(v6).concat(v2)
		.concat(v7).concat(v5).concat(v3)
		.concat(v5).concat(v3).concat(v1)
		.concat(v7).concat(v5).concat(v6)
		.concat(v5).concat(v6).concat(v4)
	); 
}


function compileShader(source, type) {
	let glType = type;
	
	if (type === 'vertex') { glType = GL.VERTEX_SHADER; }
	else if (type === 'fragment') { glType = GL.FRAGMENT_SHADER; }
	
	const shader = GL.createShader(glType);
	
	GL.shaderSource(shader, source);
	GL.compileShader(shader);
	
	
	if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) { 
	                console.error(`SHADER TYPE ${type}`);
	                console.error(GL.getShaderInfoLog(shader));
	
	                return null;
	            }
	
	return shader;
}


function buildProgram(vsSource, fsSource, attributes, uniformNames) {
	const vs = compileShader(vsSource, 'vertex');
	if (vs === null) { return null; }
	
	const fs = compileShader(fsSource, 'fragment');
	if (fs === null) { return null; }
	
	const program = GL.createProgram();
	
	for (const name in attributes) {
	                const index = attributes[name];
	
	                GL.bindAttribLocation(program, index, name);
	}
	
	GL.attachShader(program, vs);
	GL.attachShader(program, fs);
	GL.linkProgram(program);
	
	if (!GL.getProgramParameter(program, GL.LINK_STATUS)) { 
	                console.error(GL.getProgramInfoLog(program));
	
	                return null;
	}
	
	const uniforms = {};
	
	for (const name of uniformNames) {
	                uniforms[name] = GL.getUniformLocation(program, name);
	}
	
	return { program, uniforms };
}


function processResize() {
	    const width = GL.canvas.clientWidth;
	    const height = GL.canvas.clientHeight;
	    const aspect = width / height;

	    if (GL.canvas.height !== height || GL.canvas.width !== width) {
		            GL.canvas.width = width;
		            GL.canvas.height = height;
		            GL.viewport(0, 0, width, height); 
		        }

	    return aspect;
}


const TENSOR_ALGEBRA = `
vec4 tmul(vec4 t1, vec4 t2) {
	return vec4(
		t1.w * t2.xyz + t1.xyz * t2.w - cross(t1.xyz, t2.xyz),
		t1.w * t2.w - dot(t1.xyz, t2.xyz)
       	);
}

vec4 lapply(vec4 t, vec3 v) {
	return vec4(t.w * v + cross(v, t.xyz), dot(v, t.xyz));
}

vec3 rapply(vec4 v, vec4 t) {
	return t.w * v.xyz - v.w * t.xyz + cross(t.xyz, v.xyz);
}

vec4 rotor(vec3 axis, float angle) {
	axis = normalize(axis);
	float cosine_half = cos(angle / 2.0);
	float sine_half = sin(angle / 2.0);

	return vec4(sine_half * axis, cosine_half);
}

vec3 rotate(vec4 t, vec3 v) {
	return rapply(lapply(vec4(-t.xyz, t.w), v), t);
}

vec3 rotate(vec3 coord, vec3 axis, float angle) {
	return rotate(rotor(axis, angle), coord);
}

vec3 apply_camera(vec3 v) {
    vec4 camera_rot = camera_dir == 0 ? tmul(
        rotor(vec3(0, 1, 0), atan(camera_pos.x, -camera_pos.z)),
        rotor(vec3(1, 0, 0), atan(-camera_pos.y, length(camera_pos.xz)))
    ) : vec4(0,0,0,1);

    vec3 result = rotate(camera_rot, v - camera_pos);

    switch (camera_dir) {
    // Все ракурсы перевёрнуты по y!
    case 1:
        result.y = -result.y;
        break;
    case 2:
        result = -result;
        break;
    case 3:
        result = vec3(-result.zy, result.x);
        break;
    case 4:
        result = vec3(result.z, -result.yx);
        break;
    case 5:
        result.zy = result.yz;
        break;
    case 6:
        result.zy = -result.yz;
        break;
    }

    return result;
}
`;




const SHADOWMAP_FS = `#version 300 es
precision highp float;

in vec3 inner_position;

uniform vec3 camera_pos;
out vec4 color;

void main() {
    vec3 diff = inner_position - camera_pos;

    gl_FragDepth = 1.0 - 0.1*inversesqrt(dot(diff, diff)); 
	color = vec4(1.0 - 0.1*inversesqrt(dot(diff, diff)), 0, 0, 1);
	//color = vec4(length(diff)*0.03,0,0,1);
	//color = vec4(diff.z*0.01, 0, 0, 1);
}
`;


const CUBE_VS = `#version 300 es
precision highp float;

in vec3 coord;

uniform float size;
uniform float aspect;
uniform vec3 axis;
uniform float angle;
uniform vec3 position;
uniform int camera_dir;
uniform vec3 camera_pos;

out vec3 inner_position;
out vec3 frag_coord;

${TENSOR_ALGEBRA}

void main() {
	frag_coord = coord;
	inner_position = rotate(coord * size, axis, angle) + position;
	vec3 cam_position = apply_camera(inner_position);
	gl_Position = vec4(cam_position.x, cam_position.y * aspect, -0.1, cam_position.z);
}
`;



const SINGLE_LIGHT_CALCULATION = `
float intensity = 0.3;

if (light.w > 0.0) {
    vec3 normal = calculate_normal();

    vec3 direction = light.xyz - inner_position;
    
    float light_inv_distance = 10.0*(1.0 - texture(shadowmap, -direction).r);
    
    float normal_direction = dot(normal, direction);
    
    float inv_distance = inversesqrt(dot(direction, direction));

    if (normal_direction > 0.0 && inv_distance/light_inv_distance > 0.99) {
        intensity = 
            light.w
            * normal_direction
            * pow(inv_distance, 3.0);
    } else {
        intensity = 0.0;
    }
}
`;


const SINGLE_LIGHT_CUBE_FS = `#version 300 es
precision highp float;

precision highp samplerCube;

out vec4 frag_color;
in vec3 frag_coord;

in vec3 inner_position;


uniform samplerCube shadowmap;
uniform vec3 color;
uniform vec4 light;

vec3 calculate_normal() {
    vec3 dir1 = dFdx(inner_position);
    vec3 dir2 = dFdy(inner_position);

    return normalize(cross(dir2, dir1));
}

void main() {

    ${SINGLE_LIGHT_CALCULATION}

    frag_color = vec4(intensity*color, 1);
	//frag_color = vec4(texture(shadowmap, frag_coord).r, 0, 0, 1);
}
`;
