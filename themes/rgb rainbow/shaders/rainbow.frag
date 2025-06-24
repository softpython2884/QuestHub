//Credit:
//Rainbow Showoff: https://www.shadertoy.com/view/lscBRf
//by akufishi

#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_speed;
uniform float u_stripes;
uniform float u_fixedColor;
uniform vec3 u_color1;

#define FALLING_SPEED  0.25
#define STRIPES_FACTOR 5.0

//get sphere
float sphere(vec2 coord, vec2 pos, float r) {
    vec2 d = pos - coord; 
    return smoothstep(60.0, 0.0, dot(d, d) - r * r);
}
    
void main()
{
  //normalize pixel coordinates
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  //pixellize uv
  vec2 clamped_uv = (floor((gl_FragCoord.x / u_stripes) + 0.5) * u_stripes) / u_resolution.xy;
  //get pseudo-random value for stripe height
  float value = fract(sin(clamped_uv.x) * 43758.5453123);
  //create stripes
  vec3 col = vec3(1.0 - mod(uv.y * 0.5 + (u_time * (u_speed + value / 5.0)) + value, 0.5));

  //add color
  if(u_fixedColor == 1.0)
  {
    col *= u_color1;
  }
  else
  {
      col *= clamp(cos(u_time * 1.0 + uv.xyx + vec3(0, 2, 4)), 0.0, 1.0);
  }

  //add glowing ends
  col += vec3(sphere(gl_FragCoord.xy, 
                                vec2(clamped_uv.x, (1.0 - 2.0 * mod((u_time * (u_speed + value / 5.0)) + value, 0.5))) *u_resolution.xy, 
                                0.9)) / 2.0; 
  //add screen fade
  col *= vec3(exp(-pow(abs(uv.y - 0.5), 6.0) / pow(2.0 * 0.05, 2.0)));
  // Output to screen
  gl_FragColor       = vec4(col,1.0);
}

