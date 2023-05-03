// Copyright © 2008-2015 Pioneer Developers. See AUTHORS.txt for details
// Licensed under the terms of the GPL v3. See licenses/GPL-3.txt

#include "attributes.glsl"
#include "noise.glsl"

uniform sampler2D rampTexture;

layout(std140) uniform GenColorData {
	vec3 v0;
	vec3 v1;
	vec3 v2;
	vec3 v3;

	float frequency;
	float fracStep;
	float hueAdjust;
	float time; // Used for texture animation
};

#ifndef FBM_OCTAVES
#define FBM_OCTAVES 8
#endif

in vec3 vertex;
in vec2 uv;

out vec4 frag_color;

// HueAdjustment function based on this StackOverflow answer
// http://stackoverflow.com/questions/9234724/how-to-change-hue-of-a-texture-with-glsl/9234854#9234854
vec4 HueShift(in vec4 color)
{
    const vec4  kRGBToYPrime= vec4 (0.299,  0.587,  0.114, 0.0);
    const vec4  kRGBToI     = vec4 (0.596, -0.275, -0.321, 0.0);
    const vec4  kRGBToQ     = vec4 (0.212, -0.523,  0.311, 0.0);

    const vec4  kYIQToR   = vec4 (1.0,  0.956,  0.621, 0.0);
    const vec4  kYIQToG   = vec4 (1.0, -0.272, -0.647, 0.0);
    const vec4  kYIQToB   = vec4 (1.0, -1.107,  1.704, 0.0);

    // Convert to YIQ
    float   YPrime = dot (color, kRGBToYPrime);
    float   I      = dot (color, kRGBToI);
    float   Q      = dot (color, kRGBToQ);

    // Calculate the hue and chroma
    float   hue     = atan (Q, I);
    float   chroma  = sqrt (I * I + Q * Q);

    // Make the user's adjustments
    hue += hueAdjust;

    // Convert back to YIQ
    Q = chroma * sin (hue);
    I = chroma * cos (hue);

    // Convert back to RGB
    vec4    yIQ   = vec4 (YPrime, I, Q, 0.0);
    color.r = clamp (dot (yIQ, kYIQToR), 0.0, 1.0);
    color.g = clamp (dot (yIQ, kYIQToG), 0.0, 1.0);
    color.b = clamp (dot (yIQ, kYIQToB), 0.0, 1.0);

    // the result
    return color;
}

vec4 GetColour(in vec3 p)
{
	float n = fbm(p * 3.14159, FBM_OCTAVES, frequency, 0.5, time);
	// the input texture is a vertical color ramp, uniform in the X axis
	// Convert the -1 .. 1 vertical spherical coordinate to a 0..1 GL texture coordinate and distort with random noise.
	vec2 uv = vec2(0.5, ((p.y + 1.0) * 0.5) + (n * 0.075));
	vec4 color = vec4(texture(rampTexture, uv).xyz, 1.0);
	return color;
}

// in patch surface coords, [0,1]
// v[0] to v[3] are the corner vertices
vec3 GetSpherePoint(in float x, in float y) {
	return normalize(v0 + x*(1.0-y)*(v1-v0) + x*y*(v2-v0) + (1.0-x)*y*(v3-v0));
}

void main(void)
{
	float xfrac = (uv.x-0.5) * fracStep;
	float yfrac = (uv.y-0.5) * fracStep;

	// call the GetColour function implemented for this shader type
	// Hue Shift the colour and store the final result
	frag_color = HueShift(GetColour(GetSpherePoint(xfrac, yfrac)));
}
