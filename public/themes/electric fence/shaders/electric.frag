//Electric Fence: https://www.shadertoy.com/view/4sVBWd
//by MadEqua

#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_speed;
uniform float u_layers;
uniform float u_scale;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_color4;

const float PI = 3.141593;
const float TWO_PI = PI * 2.0;

float rand(float v) {
    return fract(sin(v) * 5364.54367);
}

float noise(float v){
    float i = floor(v);
    float f = fract(v);   
    float a = rand(i);
    float b = rand(i + 1.0);                   
    return mix(a, b, smoothstep(0.0, 1.0, f));
}

vec2 rotate2D(float angle, vec2 uv) {
    return mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * uv;
}

float hex(vec2 p, float thickness) {
    p.x *= 0.57735 * 2.0;
	p.y += mod(floor(p.x), 2.0) * 0.5;
	p = abs((mod(p, 1.0) - 0.5));
    float sm = thickness * 0.5;
	return smoothstep(thickness + sm, thickness - sm, abs(max(p.x * 1.5 + p.y, p.y * 2.0) - 1.0));
}

vec3 pallete() {
    vec3 ORANGE = vec3(0.7, 0.3, 0.1);
	vec3 BROWN = vec3(0.5, 0.35, 0.2);
    vec3 PURPLE = vec3(0.6, 0.2, 0.5);
    vec3 RED = vec3(0.7, 0.1, 0.2);
    vec3 c1 = mix(u_color1, u_color3, noise(u_time * 0.55 + 185.43));
    vec3 c2 = mix(u_color2, u_color4, noise(u_time * 0.45 + 1485.34));
    return mix(c1, c2, noise(u_time * 0.5 + 432.63));
}

float modI(float a,float b) {
    float m=a-floor((a+0.5)/b)*b;
    return floor(m+0.5);
}

void main()
{
	vec2 uv = (gl_FragCoord.xy - u_resolution.xy * 0.5) / u_resolution.y;
    uv = rotate2D((noise(u_time * 0.05 + 534.453) - 0.5) * TWO_PI, uv);
    
    float tiles = sin(u_time * 0.5 + 12.5) * 6.0 + 9.0;
    const int LAYERS = 6;
    
    vec3 pal = pallete();
    vec3 col = pal * 0.6;
    
    float scaleAnim = 0.15 * sin(u_time*u_speed * 1.3 + 4324.0) + 0.2;
    vec2 cameraAnim = (vec2(noise(u_time*u_speed * 0.15 + 123.25), noise(u_time*u_speed * 0.2 + 1544.123)) - 0.5) * 10.0;

    float scale = u_scale;
    for(int i = 1; i <= LAYERS; ++i) {

    	if( float(i) > u_layers)
    		break;

        float thicknessAnim = 0.08 * sin(0.9 * u_time + float(i) * 0.6) + 0.1;
        
        float h = hex((scale * uv * tiles) + cameraAnim, thicknessAnim);
        vec3 c = float(i) * pal * h;
        
        c *= mix( 0.9, -noise(u_time * 0.5 + 1515.11) * 0.6,  step( 0.5, modI(float(i), 2.) ) );
        c += mix(0.2, -0.2, hex(5.0 * uv, 0.6)) * h;
   
      	col += (1.0 - length(uv)) * c /2.;
        scale -= scaleAnim / float(LAYERS);
    }
           
    gl_FragColor = vec4(col, 1.0);
}
