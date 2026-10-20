# Coordinate and geometry oracle
Source: [createArena](../../src/match.ts), [createPlanetField](../../src/planets.ts).
## V-GEO-01 — capture coordinate normalization
Use CSS viewport W,H, capture Iw,Ih; px=(x*Iw/W,y*Ih/H).
Do not assume captured resolution equals W*DPR; Region Capture may rescale it.
Never infer aspect-ratio changes from pixel scale alone; retain CSS dimensions.

## Arena, CSS pixels
L=44W/1672; R=1629W/1672; T=40H/941; B=887H/941.
Cw=R-L; Ch=B-T; S=min(Cw/2,Ch); Cy=(T+B)/2.
BallRadius=.025S; goalHeight=.15S; goalWidth=.4*goalHeight.
GoalXs=[40W/1672,1633W/1672]; goalTop=T+p*(Ch-goalHeight).
BallCenter=(L+bx*Cw,T+by*Ch); waiting bx=by=.5, not necessarily viewport center.
## V-GEO-02 — planet coordinate alignment
Tolerate geometry error per [matching](matching.md), after pixel mapping.

## Left formation, frame centers and widths
half=Cw/2; gap=.04*half; J=.4S; E=.3S; D=.15S.
jx=L+gap+J/2; ex=L+half-gap-E/2.
mx=(jx+J/2+ex-E/2)/2.
vgap=(Ch-2D)/3*2.1; dy=(D+vgap)/2.
Jupiter=(jx,Cy,J); Earth=(ex,Cy,E).
Ice=(mx,Cy-dy,D); Lava=(mx,Cy+dy,D).
Right frame center x'=L+R-x; y/width unchanged.

## Sprite-to-body mapping
Frame543x724; s=frameWidth/543; frameHeight=724s.
Metadata (bodyCx,bodyCy,bodyDiameter):
Earth=(288.5,356,498); Jupiter=(276.5,355,498).
Lava=(267,356,503); Ice=(257.5,356,500).
bodyX=x+(bodyCx-271.5)*s*(right?-1:1).
bodyY=y+(bodyCy-362)*s; bodyRadius=bodyDiameter*s/2.
RingRadius=bodyRadius*{Jupiter:1.15,Earth:1.4,Lava:1.7,Ice:1.7}.
## V-GEO-03 — ring body alignment
Use these body centers for ring fits; frame centers can differ.
## V-GEO-04 — right-side mirroring
Right-side template AND mask must be flipped, including body offset.

## Geometry fixtures
[geometry.json](../assets/geometry.json) contains exact generated coordinates for:
landscape960x540, portrait390x844, short844x390.
These are nominal game viewports; the current workspace preview is only16:9.
To test portrait/short, use the direct game at that viewport or a future viewport control.
Regions for color/net detection are around the expected net rectangles, expanded by
the geometry tolerance plus up to3 CSS px frame stroke; glow is excluded from bounds.
Planet search ROI should include full padded frame, then clip to the image.
Do not run matchTemplate if the clipped ROI is smaller than the template.

```cv-config
[
{"id":"V-GEO-01","checks":[{"op":"frame"}],"scope":"Capture normalization and RGBA integrity.","relatedIds":["C-COURT-05"]},
{"id":"V-GEO-02","stages":["S-PLAY"],"checks":[{"op":"planets"}],"scope":"Observable planet locations and sizes.","relatedIds":["C-COURT-04","C-PLANET-03"]},
{"id":"V-GEO-03","stages":["S-PLAY"],"checks":[{"op":"rings"}],"scope":"Body-centered ring geometry.","relatedIds":["C-PLANET-04","I-PHYSICS-02"]},
{"id":"V-GEO-04","stages":["S-PLAY"],"checks":[{"op":"planets","side":1}],"scope":"Mirrored right-side artwork and offsets.","relatedIds":["C-PLANET-02"]}
]
```
