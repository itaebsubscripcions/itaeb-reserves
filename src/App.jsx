import React, { useState, useRef, useEffect, useMemo, memo, useCallback } from "react";

/* ============================================================
   ITAEB · Reserves — Prototip funcional (v0.5)
   Colors: groc #F8B800 · blau #0098E0 · vermell #E00010 · negre
   ============================================================ */

const BRAND = { groc: "#F8B800", blau: "#0098E0", vermell: "#E00010", negre: "#101012" };
// Correu institucional automàtic: inicial del nom + cognom @itaeb.cat (ex. Rubén Ventura -> rventura@itaeb.cat)
// Les llibreries d'Excel/CSV només es carreguen quan realment s'importa o s'exporta.
const carregaPapa = () => import("papaparse").then((m) => m.default || m);
const carregaXLSX = () => import("xlsx");

const QR_PREFIX = "ITAEB:";
const qrDe = (codi) => QR_PREFIX + codi;
const senseAccents = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
function correuDe(nom) {
  const parts = senseAccents(String(nom || "").trim()).split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  const ini = parts[0][0].toLowerCase();
  const cognom = (parts.length > 1 ? parts[1] : parts[0]).toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${ini}${cognom}@itaeb.cat`;
}

const TORNS = { mati: { nom: "Matí", rang: "08:00–14:30" }, tarda: { nom: "Tarda", rang: "15:00–21:30" } };
const DIES = ["Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres"];

const FRANGES = [
  { ini: "08:00", fi: "09:00" }, { ini: "09:00", fi: "09:55" }, { ini: "09:55", fi: "10:50" },
  { ini: "10:50", fi: "11:20", pati: true }, { ini: "11:20", fi: "12:20" }, { ini: "12:20", fi: "13:15" },
  { ini: "13:15", fi: "14:10" }, { ini: "14:10", fi: "15:00", migdia: true }, { ini: "15:00", fi: "16:00" },
  { ini: "16:00", fi: "16:55" }, { ini: "16:55", fi: "17:50" }, { ini: "17:50", fi: "18:20", pati: true },
  { ini: "18:20", fi: "19:20" }, { ini: "19:20", fi: "20:15" }, { ini: "20:15", fi: "21:10" },
];

// Inventari complet extret del full d'inventari del centre (totes les pestanyes).
// Format compacte: codi | descripció | categoria | marca | unitats | ubicació
const INVENTARI_TSV = `BGM113A	Blackmagic pocket cinema camera 4k	Vídeo	Blackmagic	4	Magatzem
STUDIOCAME	Blackmagic studio camera 4k plus g2	Vídeo	Blackmagic	3	Podcast
STUDIOCAME2	Blackmagic studio cmaera 4kpro	Vídeo	Blackmagic	2	Magatzem
HPS45175	Objectiu Lumix 45-175mm	Vídeo	Panasonic	3	Plató TV
HPS14042	Objectiu Lumix 14-42 mm	Vídeo	Panasonic	3	Plató TV/Podcast
BLACKMAGIC	Servo de focus Blackmagic	Vídeo	Blackmagic	5	Magatzem
BLACKMAGIC2	Servo de zoom Blackmagic	Vídeo	Blackmagic	5	Magatzem
MS3SMB	Maletes LENTS (24mm, 35mm i 55mm: 9 lents en total)	Vídeo	Sirui	3	Magatzem
BLACKMAGIC3	Mescladora de vídeo 4k	Vídeo	Blackmagic	2	Plató TV
CONTROLCAM	Control Camera	Vídeo	Blackmagic	1	Magatzem
BLACKMAGIC4	Doble Monitor LCD 8 pulgadas	Vídeo	Blackmagic	3	Plató TV
BLACKMAGIC5	SmartScope Duo 4K Doble Monitor 8 pulgadas	Vídeo	Blackmagic	2	Plató TV
BLACKMAGIC6	Camera Control Panel RCP 4 cámaras	Vídeo	Blackmagic	1	Magatzem
BLACKMAGIC7	SmartView 4K G3 - Monitor UHD amb SMPTE-2110	Vídeo	Blackmagic	2	Plató TV
CONTROLADO	Controladora Blackmagic Micro control Panel	Àudio	Blackmagic	3	Magatzem
ZOOMH5	Zoom H5	Altres	Zoom	5	Magatzem
RODEWIRELE	Rode Wireless Go	Altres		3	Magatzem
NTG5	Ntg5	Altres		3	Magatzem
CHAMSYSMAG	Chamsys MagiQ	Altres	Chamsys	1	Magatzem
INSTANTHAZ	Instant Hazer 1400 pro	Il·luminació	Cameo	1	Magatzem
PIANOYAMAH	Piano Yamaha	Música		2	Magatzem
PIANONORD	Piano NORD	Música		1	Magatzem
TAULADEDJP	Taula de DJ Pioneer	Altres		1	Magatzem
ZVE10II	Càmera	Vídeo	Sony	2	Magatzem TNC
FLX4-01	Controladora dj	Altres	Pioneer DJ	55	Poli1
PLX500K	Plat vinil dj	Altres	Pioneer DJ	4	Poli1
DJM750MK2	Mixer	Altres	Pioneer DJ	2	?
XDJ700	XDJ	Altres	Pioneer DJ	2	Magatzem
WMCBDDJFLX	Funda protectora	Altres	Walkasse	2	Magatzem
TNCLTLX1	Taula de llum	Altres	Avolite	2	Magatzem TNC
MON12AG3	Monitor	Àudio	Ld systems	6	Poli1
XDJ7002	Reproductor àudio	Àudio	Pioneer DJ	2	Poli1
DJM750MK22	Mixer àudio	Àudio	Pioneer DJ	1	Poli1
ALTAVEUTOP	Altaveu top	Àudio	Alto	2	Poli1
ALTAVEUSUB	Altaveu subwoofer	Àudio	Alto	2	Poli1
X32	Mixer àudio	Àudio	Behringher	1	Poli1
Stairville	Led Bar 240/8 RGB DMX 30º	Àudio	(21) 74023ebd00966	1	Magatzem
BOLADEMIRA	Bola de miralls mitjana	Àudio		2	Poli1
MEGAHEXPAR	Focus par	Àudio	ADJ	5	Poli1
COREPARQ12	Focus par	Àudio	Chauvet DJ	3	Poli1
LEDPAR64CO	Par-64 LED	Àudio	Eurolite	14	Poli1
INTIMIDATO	Robot Spot	Àudio	Chauvet	11	Poli1
WOOKIE200R	Làsers	Àudio	Cameo	2	Poli1
MH110	Wash	Àudio	Stairville	4	Poli1
LEDBAR24082	Barra LED	Àudio	Stairville	4	Poli1
SHOWBARTRI	Barra Tri LED	Àudio	Stairville	4	Poli1
COLORSSONI	Strobe	Àudio	Varytec	2	Magatzem
THUNDERWAS	Strobe - blinder - wash	Àudio	Cameo	1	Poli1
NANOCONTRO	Controladora visuals	Vídeo	Korg	15	Poli1
AK42008	Projector	Vídeo	Acer	1	Poli1
ESPAIS	Espais	Cablatge		1	Magatzem
PLANTABAIX	Planta baixa (b/n)	Cablatge		1	Magatzem
MAGATZEMIS	Magatzem IS	Cablatge		1	Magatzem
MAGATZEMAU	Magatzem Auditori	Cablatge		1	Magatzem
PRIMERAPLA	Primera planta (freds)	Cablatge		1	Magatzem
POLIVALENT	Polivalent1	Cablatge		1	Magatzem
PODCAST	Podcast	Cablatge		1	Magatzem
SEGONAPLAN	Segona planta (calents)	Cablatge		1	Magatzem
POLIVALENT2	Polivalent2	Cablatge		1	Magatzem
AULAESPECT	Aula Espectacles	Cablatge		1	Magatzem
PLATOTV	Plató TV	Cablatge		1	Magatzem
ESTUDIDESO	Estudi de so	Cablatge		1	Magatzem
LOCUTORIS	Locutoris	Cablatge		1	Magatzem
TERCERAPLA	Tercera planta (???)	Cablatge		1	Magatzem
TNC	TNC	Cablatge		1	Magatzem
DOCUMENTPE	Document per imprimir etiquetes auditori	Cablatge		1	Magatzem
ETIQUETESM	Etiquetes Magatzem negre	Cablatge		1	Magatzem
1	Monitor escenari	Cablatge	Ld systems	2	Auditori
AAL-PARL-1	Parled	Il·luminació	Chauvet DJ	8	Magatzem
AAL-WMH-1	Cap mòbil WASH	Il·luminació	Stairville	4	Magatzem
AAL-SPOT-1	Cap mòbil	Il·luminació	Chauvet DJ	6	Lxs21
AAL-RET-1	Retall	Il·luminació	Ovation	6	Magatzem
AAL-WHERO-1	Cap mòbil WASH	Il·luminació	Varytec	4	Magatzem
AAL-FRES-1	Fresnel	Il·luminació		8	Magatzem
HCX2000	4k video camera	Vídeo	Panasonic	1	Armari vídeo
ALPHA6700I	Interchangable Lens Digital Camera Muntura E	Vídeo	Sony	1	Armari vídeo
EOSR100	Digital Camera Muntura RF-S	Vídeo	Canon	2	Armari vídeo
MK290XTA32	trípode càmera	Vídeo	Manfrotto	2	Magatzem CAIXA TRÍPODES
60MMF28MAC	Objectiu macro 60mm/ F2.8 (R)	Vídeo	TIG. 7artisans	1	Armari vídeo
60MMF28	Objectiu 60 mm/ F 2.8 (R)	Vídeo	TIG. 7artisans	2	Armari vídeo
50MMF095	Objectiu 50 mm/F0,95	Vídeo	TIG. 7artisans	3	Armari vídeo
50MMF18	Objectiu 50 mm/F1.8 Anamorphic	Vídeo	Sirui	1	Armari vídeo
WEEBILL3S	Gimball 1	Vídeo	Zhiyun	1	Armari vídeo
WEEBILL3S2	Gimball 2	Vídeo	Zhiyun	1	Armari vídeo
WEEBILL3S3	Gimball 3	Vídeo	Zhiyun	1	Armari vídeo
NINJAV54KP	Monitor gravador	Vídeo	Atomos	1	Armari vídeo
ATOMXCAST	Consola de streaming	Vídeo	Atomos	1	Armari vídeo
NINJAULTRA	Gravadora	Vídeo	Atomos	1	Armari vídeo
ATEMMINIPR	Mesclador streaming	Vídeo	Blackmagic	1	Armari vídeo
KITNETEJAC	Kit Neteja camera	Vídeo	Zeiss	1	Armari vídeo
DGK	DGK	Vídeo	DGK	2	Armari vídeo
TPDY100BK	Aranya dolly stand	Vídeo	Medis	1	Caixa trípodes magatzem
STREAMDECK	Stream deck	Vídeo	elgato	1	Armari vídeo
CAMLINK4K	Capturadora externa de streaming i gravació	Vídeo	Elgato	1	Armari vídeo
4PORHDMIVI	Video splitter	Vídeo	startech.com	2	Armari vídeo
BOSSAESPOR	Bossa esport fina	Vídeo	Kipsta Decathlon	1	Magatzem
MOTXILLAPE	Motxilla per equipament variat	Vídeo	Forclaz Decathlon	1	Magatzem
MOTXILLAPE2	Motxilla per càmera o material amb cremallera seguretat	Vídeo	Kipsta Decathlon	1	Magatzem
NH900	Motxilla per a panasonic	Vídeo	Quechua	1	Magatzem
SONYALPHA7	Sony aplha 7	Vídeo	Sony	1	Magatzem
FE42470	Objectiu 24-70mm	Vídeo	Sony	1	Magatzem
MS3SMB2	Maletes de lents Blackmagic (24mm, 35mm i 55mm: 9 lents en	Vídeo	Sirui	1	MAGATZEM/armari
CONVNVIPFI	2110 IP Mini BiDirect 12G	Vídeo	Blackmagic	1	Pòdcast
CLAQUETACO	Claqueta color	Vídeo		1	Armari vídeo
DAVINCIRES	Panel de controles color	Vídeo	Blackmagicdesign	3	Magatzem
PRO1D	Varibale ND3-450 +C-PL 67mm	Vídeo	Kenko	1	Magatzem
DIGITALKIT	Kit filtres càmera: UV protector - Polaritzador - ND8 67mm	Vídeo	Hoya	1	Magatzem
TRIPODETV3	Trípode TV3	Vídeo	sachtler	1	Magatzem
MONITORCOL	Monitor Color BenQ	Vídeo	Benq	1	Magatzem
LPE1772V	Bateries Càmera Canon	Vídeo	Canon	1	Magatzem
HEDFZ100H	Bateria Càmera Sony	Vídeo	HecBox	1	Magatzem
NPFZ100	Bateria Càmera Sony	Vídeo	Sony	1	Magatzem
LIIONBATTE	Bateria Càmera Sony	Vídeo	Sony	1	Magatzem
PDFW50	Bateria amb USB TIPO C Càmera Sony	Vídeo	Ggcine	1	Magatzem
LPE6	Bateria Blackmagic	Vídeo	Blackmagic/Canon	1	Magatzem
LPE62	Bateria Blackmagic	Vídeo	Jupio	1	Magatzem
NPF570F550	Bateria Externa	Vídeo	Newell	1	Magatzem
RPNPF770	Bateria Externa	Vídeo	HecBox	1	Magatzem
USBCTOSONY	USB-C to Sony NP-FZ100	Vídeo	Zilr	1	Magatzem
TYPECTOHDT	TYPE-C to HDTV	Vídeo		1	Magatzem
LECTORDETA	Lector de targetes	Vídeo	Logilink	1	Magatzem
MATTEBOXMI	Suport per instal·lar filtres de 4 x 5,65"	Vídeo	SmallRig	1	Magatzem
MAGICFIZWI	Kit per follow focus	Vídeo	SmallRig	1	Magatzem
USBTYPECIN	Adaptadors type-c 7 in 1 Mini Dock	Vídeo	Acer	1	Magatzem
MANFROTTO0	Contrapesos per trípodes llum o similar	Vídeo	Manfrotto	1	POLIVALENT 1 vdj
MYF	claqueta estandar MYF	Vídeo	Cinetools	1	Magatzem - armari cam.
IN1608	Conmutador escalador	Vídeo	Extron	1	Magatzem
STUDIOCAME3	Càmeres de vídeo	Àudio	Blackmagic	1	Sala
CABLESHDMI	Cables HDMI	Àudio	/-	1	Sala i peixera
ALLARGADOR	Allargadors de corrent	Àudio	/-	1	Sala
290XTRA	Trípode	Àudio	Manfrotto	1	Sala
PROWT600	Dolly	Àudio	Walimex	1	Sala
2110IP	Mini IP to HDMI	Àudio	Blackmagic	1	Magatzem
SMT7B	Micròfon vocal dinàmic	Àudio	Shure	1	Sala i peixera
K240STUDIO	Auriculars	Àudio	AKG	11	Sala i peixera
ADAPTADORM	Adaptador mini jack - jack	Àudio	/-	1	Magatzem
MSTUDIO	caixa multiconnector àudio	Àudio	The sssnake	1	Sala i peixera
HP60	Preamplificador	Àudio	PreSonus	1	Magatzem
HD32	Monitor	Àudio	LG	1	Sala i peixera
SUPORTMONI	Suport monitors	Àudio	Tooq	1	Peixera
T7V	Altaveus	Àudio	AdamStudio	1	Peixera
HZPEAKS	Suport Altaveu	Àudio	Phoenix	1	Peixera
CONTROL2P	Altaveus de monitoratge	Àudio	JBL	1	Sala
PODTRAKP8	Taula de so	Àudio	Zoom	1	Peixera
ATEMMINIEX	Mixer	Àudio	Black màgic	1	Peixera
4K60HZHDR	Switch/Divisor HDMI de 4 puertos	Àudio	StarTech	1	Peixera
X5ULTRAPTZ	Càmeres de vídeo - remote control	Àudio	Birddog	1	Sala
KBD	Consola remote control amb pantalla intregada	Àudio	Birddog	1	Peixera
ADAPTADORU	Adaptador USB-Ethernet	Àudio	Lenovo	1	Peixera
REGLETESGR	Regletes grans de 8 i 10 tomes	Àudio		1	Peixera
REGLETESDE	Regletes de seguretat de tres tomes	Àudio		1	Sala
REGLETADE6	Regleta de 6 tomes	Àudio		1	Sala
LITEMONSLP	SET ILUMINACIÓ (3 Unitats)	Àudio	Godox	1	Sala
BUTACA	Butaca	Àudio		1	Sala
SOFA	Sofa	Àudio		1	Sala
TAULETES	Tauletes	Àudio		1	Sala
LEDNEOITAE	LED neó ITAEB 30X40	Àudio		1	Sala
PLANTES	Plantes	Àudio		1	Sala
PORTATILIT	Portàtil ITAEB	Àudio		1	Peixera
CABLESETHE	Cables Ethernet 6A	Àudio		1	Peixera
CABLESHDMI2	Cables HDMI	Àudio		2	Peixera
HLXI80RGBW	Projectors inundació LED	Àudio	Stairville	2	Poli1
STUDIOCAME4	Blackmagic studio cmaera 4k pro g2	Vídeo	Blackmagic	1	Plató TV/Podcast
BLACKMAGIC8	Camera Control Panel RCP 4 càmeres	Vídeo	Blackmagic	1	Plató TV
BMDCONVBDC	Micro Converter BiDirectional SDI/HDMI 3G	Vídeo	Blackmagic	1	Plató TV
CONVBDCSDI	Micro Converter BiDirectional SDI/HDMI 12G	Vídeo	Blackmagic	1	Plató TV
CONVNVIPB4	2110 IP Converter 4x12G PWR	Vídeo	Blackmagic	1	Plató TV
VIDEOHUB40	Videohub 40x40 12G	Vídeo	Blackmagic	1	Plató TV
GSM4230PV1	NETGEAR AV Line 30W	Vídeo	Netgear	1	Plató TV
BDLKHCPRO8	DeckLink 8K Pro G2	Vídeo	Blackmagic	1	Plató TV
PCCORSAIR	PC Corsair	Vídeo	Corsair	1	Plató TV
NITROTECH6	Trípode càmera control TV + PAN BAR	Vídeo	Manfrotto	1	Plató TV
NITROTECH62	Trípode càmera control TV + PAN BAR	Vídeo	Manfrotto	1	Plató TV
PEDESTALTV	Pedestal TV3	Vídeo		1	Plató TV
GRUADOLLYT	Grua/dolly TV3	Vídeo		1	Plató TV
MX40PROM02	LED Display Controller	Vídeo	Novastar	1	Plató TV
THETBONEHE	Micròfons HeadmiKe O Shure Beige	Vídeo	Shure	1	Plató TV
PAL-RODE-INTERVI	Adaptador	Àudio	Rode	4	Armari àudio
TX310	Altaveu alto	Àudio	Alto	2	Plató tv
ICOA12A	Altaveu ld	Àudio	Ld systems	2	?
VM70	Altaveu pioneer vm70	Àudio	Pionner DJ	2	?
HD25	Auriculars	Àudio	Sennheiser	1	Armari àudio
ZONEVIBE12	Auriculars	Àudio	Logitech	1	Direcció
HD2501	Auriculars	Àudio	Sennheiser	1	Armari àudio
HD2502	Auriculars	Àudio	Sennheiser	1	Armari àudio
HD56901	Auriculars	Àudio	Sennheiser	1	Armari àudio
HD56902	Auriculars	Àudio	Sennheiser	1	Armari àudio
PCF8N	Bossa	Àudio	Zoom	1	Armari àudio
VOLCABEATS	Caixa de ritmes analògica	Àudio	Korg	1	Armari àudio
NANOKONTRO	Controladora	Àudio	Korg	15	Poli1
AR133	Di box	Àudio	BSS	4	Armari àudio
XLI2500	Etapa potència crown	Àudio	Crown	1	?
TASCAM-01	Gravadora	Àudio	Tascam	10	Armari àudio
GR-ZOOM-F6	Gravadora	Àudio	Zoom	1	Armari àudio
H4ESSENCIA	Gravadora	Àudio	Zoom	3	Armari àudio/ maleta
SCARLETT2I	Interface audio	Àudio	Focusrite	2	Armari àudio
SCARLETT2I2	Interface audio	Àudio	Focusrite	1	Armari àudio
VOLCABASS	Màquina de baix analògica	Àudio	Korg	1	Armari àudio
AKG-D112-1	Micròfon	Àudio	AKG	3	Armari àudio
D40	Micròfon	Àudio	AKG	8	Armari àudio
AKG-C214-1	Micròfon	Àudio	AKG	2	Armari àudio
AKG-C430-1	Micròfon	Àudio	AKG	4	Armari àudio
ATM350A	Micròfon	Àudio	Audio tecnhica	1	Armari àudio
TNC-S-MIC15	Micròfon	Àudio	dbx	2	Tnc - magatzem
NTG1-1	Micròfon	Àudio	Rode	5	Armari àudio
NT1AI1	Micròfon	Àudio	Rode	1	Armari àudio
Rode-Lavalier-N0	Micròfon	Àudio	Rode	12	Armari àudio
DC1392154	Micròfon	Àudio	Rode	10	Magatzem
WL1a,-WL1b,-WL1c	Micròfon	Àudio	Rode	6	Armari àudio
NT55a	Micròfon	Àudio	Rode	2	Armari àudio
NTG52	Micròfon	Àudio	Rode	3	Magatzem
NT1AI2	Micròfon	Àudio	Rode	1	Armari àudio
1_2	Micròfon	Àudio	Rode	2	Magatzem
E608	Micròfon	Àudio	Sennheiser	2	Armari àudio
MD421-1	Micròfon	Àudio	Sennheiser	2	Armari àudio
MIC-e609-1	Micròfon	Àudio	Sennheiser	2	Armari àudio
MIC-e906-1	Micròfon	Àudio	Sennheiser	2	Armari àudio
SM57-LCE-1	Micròfon	Àudio	Shure	8	Armari àudio
SM58-1	Micròfon	Àudio	Shure	8	Armari àudio
SM7BNEGRO	Micròfon	Àudio	Shure	5	Magatzem audio sancho
1_3	Micròfon	Àudio	Shure	2	Plató tv
1_4	Micròfon	Àudio	Shure	2	Plató tv
1_5	Micròfon	Àudio	Shure	2	Plató tv
CVLBCTQGLA	Micròfon	Àudio	Shure	1	Plató tv
Lavalier-AKG-01	Micròfon	Àudio	AKG	5	Armari àudio
MIXERAURIC	MIXER AURICULARS 6 canals	Àudio	PreSonus	1	Estanteria 3.4
RODECASTER	Mixer i gravadora	Àudio	Rode	1	Plató tv
PODTRAKP82	Mixer i gravadora	Àudio	Zoom	1	Armari àudio
SOLIDCOMC1	Pack intercoms	Àudio	Hollyland	1	Armari vídeo
BLIMP	Paravents	Àudio	Rode	1	Armari àudio
MST01B	Peu de micro sobretaula	Àudio	Gravity	1	Armari àudio
MEGAHEXPAR2	Par led	Il·luminació	ADJ	7	Aula escènica
I1010MEATA	bandera 30"x36"	Il·luminació	Avenger	1	magatzem
C500	Pìnça gaffer universal Pelican gaffer grip	Il·luminació	Avenger	1	magatzem
F1501	Portaporex	Il·luminació	Avenger	1	magatzem
AC200MAX	Portable power Station	Il·luminació	Bluetti	1	Magatzem
CALIBRADOR	Calibrador	Il·luminació	Calibrite	1	Magatzem
COLORCHECK	Cartas de color	Il·luminació	Calibrite	1	Magatzem
INSTANTHAZ2	Màquina Haze	Il·luminació	Cameo	1	Armari VDJ
LITEMASTER	Fotòmetre	Il·luminació	ch	1	Armari vídeo
QUICKQ10	Taula de llums Chamsys QuickQ 10	Il·luminació	ChamSys	1	Aula escènica
HURRICANEH	Màquina Haze	Il·luminació	Chauvet DJ	1	Magatzem
CARTADEGRI	Carta de grisos	Il·luminació	DGK	1	Magatzem
20LAB9901	Key light air - llum conferència vídeo	Il·luminació	elgato	1	magatzem
OPENDMXUSB	Adaptador DMX USB	Il·luminació	Enttec	3	Aula escènica
PAR64LED	Par-64 LED	Il·luminació		1	Magatzem
VP1DMXVIDE	Panell led quadrat	Il·luminació	Varytec	6	Plató tv
CAMEOHYDRA	Barra de 4 caps mòbils	Il·luminació	Cameo	1	Magatzem
LEDPLL384C	Panell LED petit	Il·luminació	Eurolite	1	Plató tv
LEDPLL4804	Panell LED gran	Il·luminació	Eurolite	1	Plató tv
LITEMONSLT	Maleta panells LED	Il·luminació	Godox	3	magatzem
CHROMAKEYF	Chroma Key Fx background green	Il·luminació	Manfrotto	1	guardat magatzem
BOTTLETOP5	Difusor circular Difusor + Dorado/Blanco y Sunfire/Plata	Il·luminació	Manfrotto	1	magatzem
BOTTLETOP52	lastolite (funda blava)	Il·luminació	Manfrotto	1	magatzem
FORZA60C	LED RGBLAC Spot Light	Il·luminació	Nanlite	1	magatzem
FS300B	LED B color Spot Light	Il·luminació	Nanlite	1	magatzem
SBMP60	SoftBox MixPanel - 60	Il·luminació	Nanlite	1	magatzem
SBRT90X60	Square softbox of 60x90cm	Il·luminació	Nanlite	1	magatzem
FL206	Mini focusable fresnel lens	Il·luminació	Nanlite	1	magatzem
MIXPANEL60	LED RGBWW Panel	Il·luminació	Nanlite	2	magatzem
FL11	Focusable FRESNEL lens	Il·luminació	Nanlite	1	magatzem
LS28858	Trípode llum 5/8 y 1/4-20	Il·luminació	Nanlite	1	magatzem
BESK1	Background Support Stand	Il·luminació	Nanlite	1	desmuntat guardat magatz
CEFERINOCS	Ceferino c-stand	Il·luminació	Nanlite	1	magatzem
SBPR120Q	lantern softbox PARABOLIC 90	Il·luminació	Nanlite	1	magatzem
LANTERNSOF	lantern softbox 80	Il·luminació	Nanlite	1	Magatzem
STUDIOPROW	Jirafa Boom stand	Il·luminació	Phottix	1	magatzem
E202	Rotllo 1/2 CTB	Il·luminació	Rosco e color +	1	magatzem
E250	Rotllo 1/2 White Diffusion	Il·luminació	Rosco e color +	1	magatzem
FLASHMATEL	Fotòmetre	Il·luminació	Sekonic	1	magatzem
LITEMASTER2	Fotòmetre	Il·luminació	Sekonic	1	magatzem
AULAESCENI	Aula escènica	Il·luminació		2	Aula escènica
LEDTHEATER	Spot LED teatre	Il·luminació	Varytec	6	Aula escènica
PAPERCRAFT	Paper craft green Chroma	Il·luminació		1	magatzem
BACKGROUND	Background Support Stand	Il·luminació		1	magatzem / funda
TELANEGRA	tela negra	Il·luminació		1	magatzem
TELABLANCA	tela blanca	Il·luminació		1	magatzem
TELAVERDAC	tela verda chroma	Il·luminació		1	magatzem
BOLADISCOT	Bola discoteca	Il·luminació	Karma	2	Magatzem
8WAYDMXSPL	Splitter 8-way DMX	Il·luminació	HQ Power	1	Plató TV
8WAYDMXSPL2	Splitter 8-way DMX	Il·luminació	HQ Power	3	Aula escènica
74272EDH	Light stand	Il·luminació	fungeneration	2	Aula escènica
BLS315	Light stand	Il·luminació	stageworx	2	Aula escènica
BARRAPERPE	Barra per penjar focus	Il·luminació	Hilec	2	Aula escènica
T1	Controlador de llums	Il·luminació	Avolites	1	Magatzem
GORILLASAN	Sacs de sorra per a cefes, ponts, girafes, plafons...	Il·luminació	Flyght pro	1	Plató TV
FRESNELQ6	Showtec performer 1500 fresnel Q6	Il·luminació	Showtec	1	Magatzem
1500FRES	Barndoor performer	Il·luminació	showtec	1	Magatzem
HEROWASH302	wash 300 FC	Il·luminació	Varytec	1	Magatzem
PFE60WWCWP	Spot 20-50	Il·luminació	Eurolite	1	Magatzem
VP1DMXVIDE2	DMX Video	Il·luminació	Varytec	1	Magatzem
HYDRABEAM4	HydraBeam	Il·luminació	Cameo	1	Magatzem
HYDRABEAM42	Hydra Beam	Il·luminació	Cameo	1	Magatzem
30STKIT230	Soldador Elèctric	Taller	JBC	1	Caixa cartró gran a la e
REVISIOINE	Tipus	Taller	Ubicació	1	Magatzem
MER0626	Sony Alpha	Taller	Magatzem	1	Magatzem
MER06262	BlackMagic	Taller	Magatzem	1	Magatzem
MER06263	Prod musical	Taller	Magatzem	1	Magatzem
MER06264	CDJ	Taller	Magatzem	1	Magatzem
TAH2WB	Pandereta	Música	Meinl percusion	1	Sancho????
CAJON	Cajón	Música	La rosa	1	Magatzem
UNIVERSALS	Guitar stand	Música	Fender	1	Magatzem
14076	Banquette de claviers	Música	König & meyer	1	Magatzem
5608	Drum throne	Música	Gibraltar	1	Magatzem
CHAMPION10	Ampli guitar	Música	Fender	2	Magatzem
RB112	Ampli bass	Música	Ampeq	2	Magatzem
ELECTRO6HP	Synth	Música	Nord	1	Magatzem
KSTS01B	Keyboard stand	Música	Gravity	1	Magatzem
P225WH	Piano	Música	Yamaha	1	Magatzem
L200WH	Estructura piano	Música	Yamaha	1	Magatzem
MGUS1	Merengue güiras shaker	Música	Meinl percusion	1	Magatzem
F610	Gig bag	Música	Fender	1	Magatzem
DH80	Monitor electric drumset	Música	Laney	1	Magatzem
HB100VWBM	Bongos	Música	Meinl percusion	1	Magatzem
VX50AG	Ampli guitar ac	Música	VOX	2	Magatzem
494000503	Acustic guitar	Música	Fender	2	Magatzem
378051505	Electric guitar	Música	Fender squire	2	Magatzem
378603506	Electric bass	Música	Fender squire	1	Magatzem
378553505	Electric bass	Música	Fender squire	1	Magatzem
LAUNCHKEYM	Controlador MIDI	Música	Novation	18	Espai Projectes
RDP0F5	Bateria	Música	Yamaha	1	Magatzem
DTX432K	Bateria Elecrtrònica	Música	Yamaha	1	Magatzem
APCMINIMK2	Controlador MIDI	Música	Akai	1	Espai Projectes
APCMINIMK3	Controlador MIDI	Música	Akai	1	Espai Projectes
APCMINIMK4	Controlador MIDI	Música	Akai	1	Espai Projectes
APCMINIMK5	Controlador MIDI	Música	Akai	1	Espai Projectes
APCMINIMK6	Controlador MIDI	Música	Akai	1	Espai Projectes
APCMINIMK7	Controlador MIDI	Música	Akai	1	Espai Projectes
APCMINIMK8	Controlador MIDI	Música	Akai	1	Espai Projectes
APCMINIMK9	Controlador MIDI	Música	Akai	1	Espai Projectes
APCMINIMK1	Controlador MIDI	Música	Akai	1	Espai Projectes
APCMINIMK12	Controlador MIDI	Música	Akai	1	Espai Projectes
APCMINIMK13	Controlador MIDI	Música	Akai	1	Espai Projectes
APCMINIMK14	Controlador MIDI	Música	Akai	1	Espai Projectes
APCMINIMK15	Controlador MIDI	Música	Akai	1	Espai Projectes
APCMINIMK16	Controlador MIDI	Música	Akai	1	Espai Projectes
APCMINIMK17	Controlador MIDI	Música	Akai	1	Espai Projectes
APCMINIMK18	Controlador MIDI	Música	Akai	1	Espai Projectes
APCMINIMK19	Controlador MIDI	Música	Akai	1	Espai Projectes
APCMINIMK110	Controlador MIDI	Música	Akai	1	Espai Projectes
APCMINIMK22	Controlador MIDI	Música	Akai	1	Espai Projectes
MINIFUSE1	Targeta de so	Música	Arturia	9	Espai Projectes
MINIFUSE2	Targeta de so	Música	Arturia	1	Espai Projectes
MINIFUSE3	Targeta de so	Música	Arturia	1	Espai Projectes
MINIFUSE4	Targeta de so	Música	Arturia	1	Espai Projectes
NANOKONTRO2	Controladora MIDI	Música	Korg	15	Magatzem
DRIVERACKP	Processador	Àudio	dbx	1	Magatzem
MASCARESNE	Màscares neutres ( 3 femenines/ 3 masculines)	Vestuari i caracterització		1	Magatzem
MASCARESLA	Màscares larvàries	Vestuari i caracterització		1	Magatzem
MASCARESEX	Màscares expressives	Vestuari i caracterització		1	Magatzem
MASASCARES	Masàscares "mim" blanques	Vestuari i caracterització		1	Magatzem
MANTAVERME	Manta vermella	Vestuari i caracterització		1	Magatzem
TELABLANCA2	Tela blanca llençol	Vestuari i caracterització		1	Magatzem
TUBDETELAB	Tub de tela blanca elàstic	Vestuari i caracterització		1	Magatzem
TELAMARRO	Tela marró	Vestuari i caracterització		1	Magatzem
TELESNEGRE	Teles negres	Vestuari i caracterització		1	Magatzem
TELACORTIN	Tela cortina negre	Vestuari i caracterització		1	Magatzem
CORBATESNE	Corbates negres	Vestuari i caracterització		1	Magatzem
PAJARITANE	Pajarita negre	Vestuari i caracterització		1	Magatzem
PARELLAGUA	Parella guants blancs petits	Vestuari i caracterització		1	Magatzem
TIRANTSNEG	Tirants negres	Vestuari i caracterització		1	Magatzem
PANTALOCUR	Pantaló curt negre	Vestuari i caracterització		1	Magatzem
PANTALONEG	Pantaló negre 36	Vestuari i caracterització		1	Magatzem
PANTALONEG2	Pantaló negre 44	Vestuari i caracterització		1	Magatzem
AMERICANAN	Americana negre L	Vestuari i caracterització		1	Magatzem
VESTITVERM	Vestit vermell S	Vestuari i caracterització		1	Magatzem
VESTITVERM2	Vestit vermell amb lluentons	Vestuari i caracterització		1	Magatzem
VESTITNEGR	Vestit negre llarg	Vestuari i caracterització		1	Magatzem
MANOLETINE	Manoletines zebra 37	Vestuari i caracterització		1	Magatzem
MANOLETINE2	Manoletines leopard amb pintxos 38	Vestuari i caracterització		1	Magatzem
MANOLETINE3	Manoletines militars 39	Vestuari i caracterització		1	Magatzem
TALONSNEGR	Talons negres 34	Vestuari i caracterització		1	Magatzem
BOTESNEGRE	Botes negres 36	Vestuari i caracterització		1	Magatzem
BOTESNEGRE2	Botes negres 38	Vestuari i caracterització		1	Magatzem
BURRES	Burres	Vestuari i caracterització		1	Magatzem
LLANCA	Llança	Atrezzo		1	Magatzem
PARAIGUANE	Paraigua negre	Atrezzo		1	Magatzem
MARTELLETJ	Martellet jutje	Atrezzo		1	Magatzem
GAFES	Gafes	Atrezzo		1	Magatzem
XIULET	Xiulet	Atrezzo		1	Magatzem
TIMBRE	Timbre	Atrezzo		1	Magatzem
FORQUILLA	Forquilla	Atrezzo		1	Magatzem
CULLARETA	Cullareta	Atrezzo		1	Magatzem
VOLSVERDS	Vols verds	Atrezzo		1	Magatzem
TASSADECER	Tassa de ceràmica blanca	Atrezzo		1	Magatzem
COPESDECHA	Copes de champagne	Atrezzo		1	Magatzem
POTADEPOLL	Pota de pollastre de cartró	Atrezzo		1	Magatzem
CONJUNTDEJ	Conjunt de joyes variades	Atrezzo		1	Magatzem
ANTIFAZNEG	Antifaz negre	Atrezzo		1	Magatzem
RAMFLORS	Ram flors	Atrezzo		1	Magatzem
MANDOTELE	Mando tele	Atrezzo		1	Magatzem
LLANTERNES	Llanternes negres	Atrezzo		1	Magatzem
LLUMBICIBL	Llum bici blanca	Atrezzo		1	Magatzem
LLUMBICIVE	Llum bici vermella	Atrezzo		1	Magatzem
LLIBREPOEM	Llibre "Poemes"	Atrezzo		1	Magatzem
DIARISPORT	Diari SPORT	Atrezzo		1	Magatzem
MALETICARA	Maletí caracterització	Vestuari i caracterització		1	Magatzem
ESTOIGDEPI	Estoig de pinzells	Vestuari i caracterització		1	Magatzem
PINZELLS	Pinzells	Vestuari i caracterització		1	Magatzem
PAQUETSESC	Paquets escumes per aplicar maquillatge Latex Free	Vestuari i caracterització		1	Magatzem
ESPONJAAPL	Esponja aplicadora	Vestuari i caracterització		1	Magatzem
POTCREMAHI	Pot crema hidratant	Vestuari i caracterització		1	Magatzem
CAPSAAMBCA	Capsa amb càpsul·les de sang	Vestuari i caracterització		1	Magatzem
COLAADHESI	cola adhesiva per pestanyes postisses	Vestuari i caracterització		1	Magatzem
MASTIXSPIR	Mastix Spirit Gum cola per postisso + pròtesis	Vestuari i caracterització		1	Magatzem
CAPSAMAQUI	Capsa maquillatge bases	Vestuari i caracterització		1	Magatzem
CAPSAMAQUI2	Capsa maquillatge coloret	Vestuari i caracterització		1	Magatzem
POTCOLAPER	Pot cola per sellar/endurir pròtesi Sealer	Vestuari i caracterització		1	Magatzem
MASTIXSPIR2	Mastix Spirit Gum Remover & Thiner	Vestuari i caracterització		1	Magatzem
TEMPLEWHIT	Temple White	Vestuari i caracterització		1	Magatzem
BORLES	Borles	Vestuari i caracterització		1	Magatzem
CERADURAPE	Cera dura per pròtesis Plastici	Vestuari i caracterització		1	Magatzem
POTPOLVORE	Pot pòlvores traslúcides Trasnlucent Powder	Vestuari i caracterització		1	Magatzem
ESTOIGDOMB	Estoig d'ombres d'ulls	Vestuari i caracterització		1	Magatzem
PERFILADOR	perfiladors	Vestuari i caracterització		1	Magatzem
CAPSABASES	Capsa bases supracolor	Vestuari i caracterització		1	Magatzem
CERATOVAPE	Cera tova per pròtesis Soft Putty	Vestuari i caracterització		1	Magatzem
PILOTESPET	Pilotes petites	Moviment		1	Armari Material
COIXINS	Coixins	Moviment		1	Magatzem
MARFEGUES	Màrfegues	Moviment		2	Armari Material
PILOTESDES	Pilotes d'escuma	Moviment		1	Armari Material
PALSDEFUST	Pals de fusta	Moviment		2	Magatzem
BOOMWHACKE	Boomwhackers - pals musicals	Música		1	Armari Material
CAJONFLAME	Cajón flamenco	Música		1	Magatzem
PANDEROS	Panderos	Música		1	Magatzem
ORDINADORS	Ordinadors portàtils alumnes	Informàtica	Lenovo	1	Magatzem
ORDINADORP	Ordinador portàtil docent	Informàtica	Lenovo	1	Magatzem
CARROORDIN	Carro ordinadors	Informàtica		1	Magatzem
CABLEPROJE	Cable projector (HDMI)	Informàtica		1	Armari Material
VAPPEBY	altaveu Bluetooth + cable	Informàtica	Ikea	1	Armari Material
MFCL2710DW	impresora	Informàtica	Brother	1	Aula Professors
CABLEUSBIM	cable USB impresora	Informàtica		1	Aula Professors
CABLEUSBDE	cable USB de recanvi impresora	Informàtica		1	Armari Material
H4ESSENCIA2	Gravadora 4 pistes	Informàtica	Zoom	2	Sancho
TRIPODEDEC	Trípode de càmera	Informàtica	Manfrotto	1	Magatzem
FONTDAIGUA	Font d'aigua	Altres		1	Magatzem
LLARGADERE	Llargaderes	Altres		1	Magatzem
IMPERDIBLE	Imperdibles plateados	Altres		1	Magatzem
ALFILERSAM	Alfilers amb perles	Altres		1	Magatzem
PALSPERBAI	Pals per baixar cortines	Altres		1	Armari Material
FARMACIOLA	Farmaciola	Altres		1	Armari Material
INSTANTCOL	Instant cold pack	Altres		1	Armari Material
FISIOCREM	Fisiocrem	Altres		1	Armari Material
TERMOMETRE	Termòmetre	Altres		1	Armari Material
PARACETAMO	Paracetamol	Altres		1	Armari Material
IBUPROFENO	Ibuprofeno	Altres		1	Armari Material
ALCHOOLETI	Alchool Etílic	Altres		1	Armari Material
AIGUAOXIGE	Aigua Oxigenada	Altres		1	Armari Material
PRESTATGER	Prestatgeria	Altres		1	Magatzem
CAIXAENMAG	Caixa enmagatzematge 78x56x18 cm 55L	Altres		1	Magatzem
CAIXAIMPRE	caixa impresora	Altres		1	Magatzem
CAIXACAFET	caixa cafetera	Altres		1	Armari Aula Profesors
CAFETERANE	cafetera Nespresso	Altres	Delonghi	1	Aula Professors
CUBSNEGRES	Cubs negres	Altres		1	Aula Insonoritzada
CUBMARRO	Cub marró	Altres		1	Aula Insonoritzada
MEGAHEXPAR3	Focus	Escenotècnia	ADJ Pure Lighting Excite	2	Magatzem Orfeo
FOCUS	Focus	Escenotècnia	Varytec LED Theatre Spot	4	Magatzem Orfeo
T1AVOLITES	T1 Avolites	Escenotècnia	Avolites	1	Magatzem
CABLESDMX5	Cables DMX 5m	Escenotècnia		1	Magatzem Orfeo
CAMEOCONTR	Taula de llums DMX	Escenotècnia	Cameo	1	Magatzem Orfeo
CABLESXLR	Cables XLR	Escenotècnia	Seetronic	1	Magatzem Orfeo
CABLEJACKS	Cable Jack ST 3.5 2X RCA 5M	Escenotècnia	Nedis	1	Magatzem Orfeo
AMERICANAB	americana blanca Lefties talla M	Vestuari i caracterització		1	Magatzem
AMERICANAN2	americana negra	Vestuari i caracterització		1	Magatzem
AMERICANAN3	americana negra lefties XL	Vestuari i caracterització		1	Magatzem
ANORACLLAM	anorac llampant marca Casual Talla M	Vestuari i caracterització		1	Magatzem
ARMILLAREF	armilla reflectant	Vestuari i caracterització		1	Magatzem
BARRETDEPA	barret de palla	Vestuari i caracterització		1	Magatzem
BARRETDEVI	barret de vídua època	Vestuari i caracterització		1	Magatzem
BARRETSIUN	barrets i una bufanda tipo rus	Vestuari i caracterització		1	Magatzem
BASTOMARRO	bastó marró	Vestuari i caracterització		1	Magatzem
BATANEGRAD	bata negra de setí	Vestuari i caracterització		1	Magatzem
BODYVERMEL	body vermell màniga 3/4	Vestuari i caracterització		1	Magatzem
BOINAAVIAD	boina aviador cuir negra	Vestuari i caracterització		1	Magatzem
BOINANEGRA	boina negra	Vestuari i caracterització		1	Magatzem
BOLSETCOLO	bolset color perla amb cadena brillants	Vestuari i caracterització		1	Magatzem
BOSSETAVEL	bosseta vellut monedes	Vestuari i caracterització		1	Magatzem
BUFNEGRE	buf negre	Vestuari i caracterització		1	Magatzem
CAIXACARTR	caixa cartró blanca i vermella purpurina - botó enfonsat M	Vestuari i caracterització		1	Magatzem
CAMERAFOTO	camera fotos (polaroid)	Vestuari i caracterització		1	Magatzem
CAMISABEIG	camisa beige coll mao talla M noi	Vestuari i caracterització		1	Magatzem
CAMISABLAN	camisa blanca màniga llarga	Vestuari i caracterització		1	Magatzem
CAMISABLAN2	camisa blanca tirants talla M Mango	Vestuari i caracterització		1	Magatzem
CAMISABLAV	camisa blava de setí	Vestuari i caracterització		1	Magatzem
CAMISADAUR	camisa daurada	Vestuari i caracterització		1	Magatzem
CAMISAMANI	camisa màniga curta lila de setí	Vestuari i caracterització		1	Magatzem
CAMISAMARR	camisa marró setinat Talla M	Vestuari i caracterització		1	Magatzem
CAMISANEGR	camisa negra màniga llarga	Vestuari i caracterització		1	Magatzem
CAMISARATL	camisa ratlles hippie talla S noi	Vestuari i caracterització		1	Magatzem
CAPANEGRA	capa negra	Vestuari i caracterització		1	Magatzem
CARTELLTAU	cartell taula bar buenas migas demana a caixa	Vestuari i caracterització		1	Magatzem
CASCOSDESO	cascos de soldat	Vestuari i caracterització		1	Magatzem
CATIFAGESP	catifa gespa artificial	Vestuari i caracterització		1	Magatzem
COLLALTSEN	coll alt sense mànigues color perla	Vestuari i caracterització		1	Magatzem
CONJUNTBAL	Conjunt ballarina de cabaret	Vestuari i caracterització		1	Magatzem
CUBELLBLAU	cubell blau amb nansa	Vestuari i caracterització		1	Magatzem
CULOTTESBL	culottes blancs Tezenis Talla M	Vestuari i caracterització		1	Magatzem
ESCOMBRARO	escombra rosa	Vestuari i caracterització		1	Magatzem
FUSILSPLAS	fusils plàstic negre	Vestuari i caracterització		1	Magatzem
GORRAAMBVI	gorra amb visera lila	Vestuari i caracterització		1	Magatzem
GORRADEPOL	gorra de policia	Vestuari i caracterització		1	Magatzem
GORRODELLA	gorro de llana	Vestuari i caracterització		1	Magatzem
GUANTSBLAN	guants blancs (parells)	Vestuari i caracterització		1	Magatzem
JAQUETATOR	jaqueta torera daurada tipus medieval	Vestuari i caracterització		3	Magatzem
JERSEIBLAU	jersei blau clar punt gran topshop	Vestuari i caracterització		1	Magatzem
JERSEIPUNT	jersei punt verd clàssic	Vestuari i caracterització		1	Magatzem
JERSEYCOLL	jersey coll alt vermell	Vestuari i caracterització		1	Magatzem
JERSEYDEPU	jersey de punt de llana groc clar	Vestuari i caracterització		1	Magatzem
LLENCOLINF	llençol infantil	Vestuari i caracterització		1	Magatzem
LLENCOLMAT	llençol matrimoni	Vestuari i caracterització		1	Magatzem
MALLANEGRA	malla negra talla S	Vestuari i caracterització		1	Magatzem
MANTAMARRO	manta marró clar gran	Vestuari i caracterització		1	Magatzem
MANTESBLAU	mantes blau marí	Vestuari i caracterització		1	Magatzem
MAQUILLATG	maquillatge	Vestuari i caracterització		1	Magatzem
MASCARESDE	màscares de gas	Vestuari i caracterització		1	Magatzem
MASCARESDU	màscares d'unicron	Vestuari i caracterització		1	Magatzem
MOCADORBEI	mocador beige	Vestuari i caracterització		1	Magatzem
MOCADORDEC	mocador de coll blau	Vestuari i caracterització		1	Magatzem
MOCADORSER	mocador serrel salmó	Vestuari i caracterització		1	Magatzem
MOCADORSCA	mocadors cap estampats 3 vermells i 1 blau	Vestuari i caracterització		1	Magatzem
MONOSTARON	monos taronja Alcatraz	Vestuari i caracterització	diverses talles	1	Magatzem
PANTALOCUR2	pantaló curt xandall negre talla L	Vestuari i caracterització		1	Magatzem
PANTALOFOS	pantaló fosc texà talla 36	Vestuari i caracterització		1	Magatzem
PANTALOMIL	pantaló militar (2XL, 1L, 2S)	Vestuari i caracterització		1	Magatzem
PANTALONEG3	pantaló negre pinsa talla 38	Vestuari i caracterització		1	Magatzem
PANTALOTEX	pantaló texà campana talla 40	Vestuari i caracterització		1	Magatzem
PANTALOTEX2	pantaló texà negre talla 40	Vestuari i caracterització		1	Magatzem
PANTALOXAN	pantaló xandall blau marí, botons crec baixos	Vestuari i caracterització		1	Magatzem
PANTALOFAL	pantaló-faldilla pata elefante verd pana	Vestuari i caracterització		1	Magatzem
PANTALONSS	pantalons sport talla gran fucsia i negre	Vestuari i caracterització		1	Magatzem
PANTALONST	pantalons taronges amples	Vestuari i caracterització		1	Magatzem
PANTYRED	panty red	Vestuari i caracterització		1	Magatzem
PARELLSDEL	parells de lentilles blanques	Vestuari i caracterització		1	Magatzem
PASSAMUNTA	passamuntanyes negres	Vestuari i caracterització		1	Magatzem
PERRUCADEI	perruca de iaia amb monyo	Vestuari i caracterització		1	Magatzem
PERRUCAROS	perruca rossa curta	Vestuari i caracterització		1	Magatzem
PERRUQUESC	perruques cabell gris curtes	Vestuari i caracterització		1	Magatzem
PIJAMABLAN	pijama blanc maniga llarga i pantaló galaxy	Vestuari i caracterització		1	Magatzem
RADIOGRAFI	radiografies	Vestuari i caracterització		1	Magatzem
RECOLLIDOR	recollidor de mà	Vestuari i caracterització		1	Magatzem
REGADORAVE	regadora verda	Vestuari i caracterització		1	Magatzem
ROTLLEDEFI	rotlle de film	Vestuari i caracterització		1	Magatzem
SABATILLES	sabatilles	Vestuari i caracterització		1	Magatzem
SAMARRETAB	samarreta blanca m/curta	Vestuari i caracterització		1	Magatzem
SAMARRETAB2	samarreta blau cel m/curta	Vestuari i caracterització		1	Magatzem
SAMARRETAC	samarreta casual groga amb lletres "Colorado" talla S	Vestuari i caracterització		1	Magatzem
SAMARRETAC2	samarreta coll alt licra estampat punts negres, blaus i gr	Vestuari i caracterització		1	Magatzem
SAMARRETAE	samarreta estampada taronja casual	Vestuari i caracterització		1	Magatzem
SAMARRETAM	samarreta màniga curta taronja Palm Beach	Vestuari i caracterització		1	Magatzem
SAMARRETAM2	samarreta màniga llarga estampat rombos	Vestuari i caracterització		1	Magatzem
SAMARRETAM3	samarreta marró m/curta	Vestuari i caracterització		1	Magatzem
SAMARRETAN	samarreta negra coll obert	Vestuari i caracterització		1	Magatzem
SAMARRETAN2	samarreta negra estampat elegant Elena Sanz	Vestuari i caracterització		1	Magatzem
SAMARRETAN3	samarreta negra guess	Vestuari i caracterització		1	Magatzem
SAMARRETAR	samarreta rosa m/curta	Vestuari i caracterització		1	Magatzem
SAMARRETAT	samarreta taronja m/curta	Vestuari i caracterització		1	Magatzem
SAMARRETAT2	samarreta turquesa maniga curta	Vestuari i caracterització		1	Magatzem
SAMARRETES	samarretes camuflatge	Vestuari i caracterització		1	Magatzem
SAMARRETES2	samarretes grogues m/curta	Vestuari i caracterització		1	Magatzem
SAMARRETES3	samarretes lila m/curta	Vestuari i caracterització		1	Magatzem
SAMARRETES4	samarretes vermelles m/curta	Vestuari i caracterització		1	Magatzem
SHORTESTAM	short estampat groc i negre	Vestuari i caracterització		1	Magatzem
SHORTNEGRE	short negre esport talla S	Vestuari i caracterització		1	Magatzem
TIRANTS	tirants	Vestuari i caracterització		1	Magatzem
TOCATDEPLO	tocat de plomes de nadiu americà	Vestuari i caracterització		1	Magatzem
TOPSVERMEL	tops vermells pullandbear diferents talles	Vestuari i caracterització		1	Magatzem
TUNICANEGR	túnica negra caputxa	Vestuari i caracterització		1	Magatzem
ULLERESANT	ulleres antigues	Vestuari i caracterització		1	Magatzem
VESTITAMPL	vestit ample curt mostassa i negre	Vestuari i caracterització		1	Magatzem
VESTITAMPL2	vestit ample verda	Vestuari i caracterització		1	Magatzem
VESTITBEIG	vestit beige midi tirants	Vestuari i caracterització		1	Magatzem
VESTITBLAN	vestit blanc llarg lefties talla S	Vestuari i caracterització		1	Magatzem
VESTITBLAU	vestit blau marí imitació setí	Vestuari i caracterització		1	Magatzem
VESTITCOLO	vestit color borgonya	Vestuari i caracterització		1	Magatzem
VESTITCURT	vestit curt animal print verd i negre	Vestuari i caracterització		1	Magatzem
VESTITCURT2	vestit curt estampat	Vestuari i caracterització		1	Magatzem
VESTITCURT3	vestit curt mostassa flors	Vestuari i caracterització		1	Magatzem
VESTITCURT4	vestit curt negre	Vestuari i caracterització		1	Magatzem
VESTITDEFL	vestit de flors	Vestuari i caracterització		1	Magatzem
VESTITLLAR	vestit llarg animal print taronja i blau	Vestuari i caracterització		1	Magatzem
VESTITNEGR2	vestit negre màniga llarga curt casual	Vestuari i caracterització		1	Magatzem
VESTITVINT	vestit vintage negre amb puntets blancs talla 42	Vestuari i caracterització		1	Magatzem
VESTITVINT2	vestit vintage ratlles vermell i blanc	Vestuari i caracterització		1	Magatzem
BARRESDOMI	barres dominades	Moviment		1	Aula Moviment
BANDESELAS	bandes elàstiques 5Kg	Moviment		1	Aula Moviment
BANDESELAS2	bandes elàstiques 15Kg	Moviment		1	Aula Moviment
BANDESELAS3	bandes elàstiques 25Kg	Moviment		1	Aula Moviment
BANDESELAS4	bandes elàstiques 35Kg	Moviment		1	Aula Moviment
BANDAELAST	banda elàstica negra (kg?)	Moviment		1	Aula Moviment
BANDAELAST2	banda elàstica lila (kg?)	Moviment		1	Aula Moviment
PILOTAGRAN	pilota gran escuma (vermella)	Moviment		1	Aula Moviment
PILOTAPETI	pilota petita escuma (verda)	Moviment		1	Aula Moviment
PILOTAPETI2	pilota petita dura (groga)	Moviment		1	Aula Moviment
PILOTAMEDI	pilota medicinal 3Kg	Moviment		1	Aula Moviment
PILOTAFITB	pilota fitball pilates	Moviment		1	Aula Moviment
BLOCSESCUM	blocs escuma	Moviment		1	Aula Moviment
PESESCANEL	peses canells-turmells 0,5kg	Moviment		1	Aula Moviment
PESESCANEL2	peses canells-turmells 1Kg	Moviment		1	Aula Moviment
PESESCANEL3	peses canells-turmells 2 Kg	Moviment		1	Aula Moviment
MANUELLA3K	manuella 3 Kg	Moviment		1	Aula Moviment
MANUELLA2K	manuella 2 Kg	Moviment		1	Aula Moviment
MANUELLA1K	manuella 1Kg	Moviment		1	Aula Moviment
CORDES	cordes	Moviment		1	Aula Moviment
RODESABDOM	rodes abdominal	Moviment		1	Aula Moviment
CONSCIRCUI	cons circuit	Moviment		1	Aula Moviment
AULAMOVIME	Aula Moviment	Moviment		1	Aula Moviment
AUDIO	Audio	Escenotècnia		1	Magatzem
12	Altaveu	Escenotècnia	Alto	2	Tnc - aula escenari
TX3102	Altaveu	Escenotècnia	Alto	2	No trobat
133	Di box	Escenotècnia	BSS	4	No trobat
XLI25002	Etapa de potència	Escenotècnia	Crown	1	Tnc - magatzem
H3VR	Gravadora 360	Escenotècnia	Zoom	1	Tnc - magatzem
SCARLETT8I	Interficie de so	Escenotècnia	Focusrite	1	No trobat
1_6	Interficie de so	Escenotècnia	Focusrite	1	No trobat
1_7	Interficie de so	Escenotècnia	Focusrite	1	Tnc - sono
1_8	Interficie de so	Escenotècnia	Focusrite	1	Tnc - sono
1_9	Micròfon	Escenotècnia	Shure	4	No trobat
1_10	Micròfon	Escenotècnia	Shure	6	Tnc - magatzem
1_11	Micròfon	Escenotècnia	Shure	7	Tnc - magatzem
2	Micròfon	Escenotècnia	dbx	1	Tnc - magatzem
10	Mixer	Escenotècnia	Yamaha	1	Tnc - magatzem
11	Mixer	Escenotècnia	Yamaha	1	No trobat
SQ5	Mixer	Escenotècnia	Allen & Heath	1	Tnc - magatzem
9	Monitor	Escenotècnia	JBL	2	No trobat
T7V2	Monitor	Escenotècnia	Adam audio	2	Tnc - magatzem
1_12	Monitor in-ear	Escenotècnia	Ld systems	3	Tnc - magatzem
DRIVERACKP2	Proc. altaveus	Escenotècnia	dbx	1	Tnc - magatzem
231S	Proc. freqüència	Escenotècnia	dbx	1	Tnc - magatzem
1231	Proc. freqüència	Escenotècnia	dbx	2	Tnc - magatzem
TS15S	Subwoofer	Escenotècnia	Alto	2	Tnc - aula escenari
1_13	Suport altaveus	Escenotècnia	Adam Hall	2	Tnc - magatzem
SUPORTALTA	Suport altaveus	Escenotècnia	Adam Hall	2	No trobat
PEUMIC	Peu mic	Escenotècnia	Ks technology	2	Tnc - magatzem
SUPORTALTA2	Suport altaveus	Escenotècnia	Gaoding?	1	Tnc - magatzem
SS5212B	Suport altaveus	Escenotècnia	Gravity	1	No trobat
BANDES	Bandes	Escenotècnia	Microfonia sense fils	1	Tnc - magatzem
BOSSAPARAV	Bossa paravents	Escenotècnia	Enganxines	1	Tnc - magatzem
ADAPTADOR	Adaptador	Escenotècnia	ADAPTADOR xlr f - ts m	1	Tnc - magatzem
ADAPTADOR2	Adaptador	Escenotècnia	ADAPTADOR auriculars pla	1	Tnc - magatzem
ADAPTADOR3	Adaptador	Escenotècnia	Duplicador auriculars	1	Tnc - magatzem
GOOBAY	Cable	Escenotècnia	ALLARGADOR IEC mascle - 	1	Tnc - magatzem
CABLE	Cable	Escenotècnia	IEC	1	Tnc - magatzem
CABLE2	Cable	Escenotècnia	MiniTRS-2x TS	2	Tnc - magatzem
CABLE3	Cable	Escenotècnia	TS - TS 0.5m (sense medi	1	Tnc - magatzem
CABLE4	Cable	Escenotècnia	TS - TS 2.5m (sense medi	1	Tnc - magatzem
CABLE5	Cable	Escenotècnia	TS - TS 5m (sense medir)	1	Tnc - magatzem
CABLE6	Cable	Escenotècnia	TRS - TRS 5m (sense medi	1	Tnc - magatzem
CABLE7	Cable	Escenotècnia	TRS - TRS 10m	1	Tnc - magatzem
CABLE8	Cable	Escenotècnia	DIN 5 pins 1m	1	Tnc - magatzem
CABLE9	Cable	Escenotècnia	DIN 5 pins 2m (?)	1	Tnc - magatzem
CABLE10	Cable	Escenotècnia	DIN 5 pins 3m	1	Tnc - magatzem
CABLE11	Cable	Escenotècnia	XLR 1m	1	Tnc - magatzem
CABLE12	Cable	Escenotècnia	XLR 3m	2	Tnc - magatzem
CABLE13	Cable	Escenotècnia	XLR 3m (sense etiquetar)	1	Tnc - magatzem
CABLE14	Cable	Escenotècnia	XLR 5m	1	Tnc - magatzem
CABLE15	Cable	Escenotècnia	XLR 10m	2	Tnc - magatzem
CABLE16	Cable	Escenotècnia	XLR 10m (sense etiquetar	1	Tnc - magatzem
CABLE17	Cable	Escenotècnia	SCHUKO 3m	1	Tnc - magatzem
REGLETA	Regleta	Escenotècnia	Tripleta	1	Tnc - magatzem
CABLE18	Cable	Escenotècnia	Regleta de 10 m (rulo)	1	Tnc - magatzem
CABLE19	Cable	Escenotècnia	XLR 5m (sense etiquetar)	1	Tnc - aula escenari
TNCLEF9	Pcled	Il·luminació	Chauvet DJ	10	Carro llums
TNCLEP5	Pcled	Il·luminació	Chauvet DJ	6	Carro llums
TNCLS2	Parled	Il·luminació	Chauvet DJ	6	Lxs02
TNCLCB2	Ciclorama	Il·luminació	Chauvet DJ	4	Lxs22
TNCLTRI1	Ciclorama	Il·luminació	Stairville	2	Lxs22
TNCLLB1	Ciclorama	Il·luminació	Stairville	2	Lxs22
TNCLMH-4	Focus	Il·luminació	Stairville	4	Lxs21
TNCLTLX2	Taula de llum	Il·luminació	Avolite	1	Magatzem TNC
TNCLCSS1	Ciclorama	Il·luminació	Varytec	2	Lxs24
TNCLHL1	Ciclorama	Il·luminació	Stairville	2	Magatzem TNC
TNCLLASER1	Laser	Il·luminació	Cameo	1	Lxs20
TNCLLASER2	Focus	Il·luminació	Cameo	1	Lxs20
TNCLLASER3	Laser	Il·luminació	Laserworld	1	Lxs20
TNCLTLX3	Taula de llum	Il·luminació	LT	1	Magatzem
/-	Filtres de color	Il·luminació	Lee filter	1	Magatzem
/-_2	Filtres de color	Il·luminació	Lee filter	1	Magatzem
/-_3	Filtres de color	Il·luminació	Lee filter	1	Magatzem
/-_4	Filtres de color	Il·luminació	Lee filter	1	Magatzem
/-_5	Filtres de color	Il·luminació	Lee filter	1	Magatzem
/-_6	Filtres de color	Il·luminació	Lee filter	1	Magatzem
/-_7	Filtres de color	Il·luminació	Lee filter	1	Lxs22
/-_8	Filtres de color	Il·luminació	Lee filter	1	Magatzem
/-_9	Filtres de color	Il·luminació	Lee filter	1	Magatzem
/-_10	Filtres de color	Il·luminació	Lee filter	2	Magatzem
/-_11	Filtres de color	Il·luminació	Rosco	1	Magatzem
RETALL	Focus	Il·luminació	Eurolite	1	Magatzem
TNCLD1	DMX	Il·luminació	Eurolite	1	Magatzem TNC
TNCLD2	DMX	Il·luminació	Eurolite	2	Magatzem TNC
STARLETTE1	PC convencional	Il·luminació	CCT	1	Magatzem TNC
SIRIOMK3	Fresnel convencional	Il·luminació	QuartzColor	1	Magatzem TNC
CANTATA	Recorte convencional	Il·luminació	Cantata	1	Magatzem TNC
TNCLROU1	Router wifi	Il·luminació	Reyee	1	Magatzem TNC
TNCLSW1	Switch gestionable	Il·luminació	TP-link	2	Aula Escenari
TNCLNODE1	Ethernet DMX node	Il·luminació	Netron	1	Magatzem TNC
TNCLP641	Par64	Il·luminació	Eurolite	6	Magatzem TNC
TNCLP56-1	Par56	Il·luminació	Eurolite	6	Lxs01
TNCLFUM1	Maquina de fum	Il·luminació	Chauvet DJ	1	Lxs21
TNCLOCYC1	Ciclorama	Il·luminació	Chauvet DJ	4	Lxs24
TRIPODEFOL	tripode follow spot	Il·luminació	Stage worx	1	bany
TNCLFL1	Follow Spot	Il·luminació	Chauvet DJ	1	Lsx25
TNCLDIM1	Dimmers	Il·luminació	Eurolight	1	Lxs24
TORRETEST	Torretes T	Il·luminació	Stage worx	1	bany
/-_12	Catàleg Lee Filters	Il·luminació	Lee filter	1	Magatzem TNC
/-_13	Lampares par56	Il·luminació	Omnilux	1	Carro llums
/-_14	Làmpades PAR CP 62	Il·luminació	Osram	1	Lxs01
TNCLQ1	Parled	Il·luminació	Chauvet DJ	6	Carro llums
TNCLORD1	Ordinador	Il·luminació	MSI	1	Magatzem
TNCLCA1	Caixetí 6 ch	Il·luminació	Alextek	3	Escenari
TNCLTIE1	Simuladors Avolite	Il·luminació	Avolite	14	Magatzem TNC
TNCLDS1	Data Stream 4	Il·luminació	Chauvet DJ	2	Magatzem TNC
77212	Gobo tropical flowers	Il·luminació	Rosco	1	Armari llums
78212	Gobo Stars7	Il·luminació	Rosco	1	Armari llums
76552	Gobo Winner	Il·luminació	Rosco	1	Armari llums
86690	Gobo vidre candelight window	Il·luminació	Rosco	1	Armari llums
188COSMETI	188 Cosmetic highlight	Il·luminació	Lee filter	1	Sala profe
DEM300	Digital Light Meter	Il·luminació	Velleman	1	Sala profe
DN94022	Kit herramientas networking	Il·luminació	Digitus	1	Sala profe
KITHERRAMI	Kit herramientas networking	Il·luminació	Digitus	1	Sala profe
TNCLFA1	Font alimentació 24V	Il·luminació	/-	1	Sala profe
TNCLDR1	Driver LED 5ch 12-24V	Il·luminació	/-	1	Sala profe
TNCLTL1	Tira LED RGBW	Il·luminació	/-	1	Sala profe
ALICATESHA	Alicates Hanlong, pilas, repuesto DYMO, tuercas, clavos, t	Taller		2	E1
MULTIMETRO	Multímetros	Taller		1	E3
PINZAAMPER	Pinza amperimétrica	Taller		1	E4
AMOLADORAS	Amoladoras, caladoras	Taller		1	E5
TALADROFUE	Taladro, fuente de alimentación CC	Taller		1	E6
SIERRAS	Sierras	Taller		2	E7
TORNAVISES	Tornavises, buscapolo, nivel	Taller		1	P1
ALICATESFO	Alicates, formones	Taller		1	P2
MUELASDECO	Muelas de corte, garlopa, cintas velcro	Taller		1	P3
MASCARILLA	Mascarillas, botiquín, coldpacks	Taller		1	P4
LLAVESFIJA	Llaves fijas, martillos, masa	Taller		1	P5
CUTTERSCIN	Cutters, cinta aislante, cinta métrica, cintas de pintor	Taller		1	P6
CAJADEHERR	Caja de herramientas, linchas	Taller		1	P7
ALARGOSREG	Alargos, regletas	Taller		1	P8
ATLASBELT	Arnés	Taller	Rock empire	4	Magatzem
ATLASUNI	Bossa	Taller	Rock empire	4	Magatzem
LB10110	Corda de seguretat	Taller	Equipo Vertical	3	Magatzem
LB10115	Corda de seguretat	Taller	Equipo Vertical	4	Magatzem
C40A	vaga d'ancoratge	Taller	Petzl	4	Magatzem
BW100LE111	Absorvedor de energía	Taller	Equipo Vertical	1	Magatzem
MOSQUETO	Mosquetó	Taller	Fixe	8	Magatzem
MALLON	Mallon	Taller	/--	10	Magatzem
Y8PLA04001	vaga d'ancoratge	Taller	canles y eslingas cyetex	1	Magatzem
GANCHO	Gancho	Taller	/--	10	Magatzem
413RFTFLN	Guants de protecció	Taller	TB Hybrid	13	Magatzem
BIZWELIONA	Xaqueta soldadura	Taller	portwest	1	Magatzem
CASCOSDEPR	Cascos de protecció	Taller	Climber	10	Magatzem
SABATESPRO	Sabates protecció	Taller	Indra S3	9	Magatzem
TNCM101	Xocolatina	Taller		11	Magatzem
TNCM105	Xocolatina	Taller		1	Magatzem
TNCM201	Polipast Cadena	Taller	Yale	2	Magatzem
TNCM203	Eslinga 1m x 1000kg	Taller		1	Magatzem
TNCM204	Eslinga 1m x 2000kg	Taller		1	Magatzem
TNCM205	Eslinga 1,5m x 1000kg	Taller		1	Magatzem
TNCM206	Eslinga 1,5m x 2000kg	Taller		1	Magatzem
TNCM207	Eslinga 1,5m x 3000kg	Taller		1	Magatzem
TNCM208	Eslinga 2m x 1000kg	Taller		1	Magatzem
TNCM209	Eslinga 2m x 2000kg	Taller		1	Magatzem
TNCM210	Eslinga 2m x 3000kg	Taller		1	Magatzem
TNCM211	Eslinga 2,5m x 1000kg	Taller		1	Magatzem
TNCM212	Eslinga 3m x 2000kg	Taller		1	Magatzem
TNCM213	Eslinga de 3m x 3000kg	Taller		1	Magatzem
TNCM214	Grapes giratories tub 50mm	Taller	Triton Blue	1	Magatzem
TNCM301	Telon boca bellut vermell 9m x 2'9m	Taller	Tossal	1	Caixa cortinatges
TNCM302	Bambalinó bellut vermell 9m x 0,4m	Taller	Tossal	1	Caixa cortinatges
TNCM303	Arlequi bellut vermell 2m x 2'9m	Taller	Tossal	1	Caixa cortinatges
TNCM304	Ciclorama téxtil 4,70 x 2,9	Taller	Tossal	1	Caixa cortinatges
TNCM305	Telón verdú negre 3m x 2,9m	Taller	Tossal	1	Caixa cortinatges
TNCM306	Tul Gobelín negre 4,7m x 2,9m	Taller	Tossal	1	Caixa cortinatges
TNCM307	Pata negre 094m x 2,9 m	Taller	Tossal	1	Caixa cortinatges
TNCM308	Bambalina negra 5,20m x 040m	Taller	Tossal	1	Caixa cortinatges
TNCM309	Ciclorama PVC blanc 4,70 x 2,9	Taller	Tossal	1	Magatzem
TNCM310	Ciclorama PVC gris 4,70 x 2,9	Taller	Tossal	1	Magatzem
TNCM311	Telons gasa bosc	Taller		1	Magatzem
TRAMSKABUK	Trams Kabuki	Taller		1	Magatzem dimmers
TNCM401	Politja nylon simple	Taller		1	Magatzem
TNCM402	Politja nylon doble	Taller		1	Magatzem
TNCM500	Terra linoleum negra 2m x 4,75m	Taller		1	Magatzem
TNCM501	Tarimes 2m x 1m (amb potes)	Taller		1	Magatzem
TNCM502	Tarimes 2m x 1m (amb tisores)	Taller		1	Magatzem
TNCM503	Potes tarima grans 0,6m	Taller		1	Magatzem
TNCM504	Potes tarima mitjanes 0,4m	Taller		1	Magatzem
TNCM505	Potes tarima petites 0,2m	Taller		1	Magatzem
TNCM506	Potes tarima especials 0,2m	Taller		1	Magatzem
TNCM507	Potes tarima especials 0,4m	Taller		1	Magatzem
TNCM508	Tiros curts (corda polipropilé)	Taller		3	Magatzem
ADAPTADORU2	Adaptador USB-C a HDMI	Vídeo		2	Magatzem TNC
G03MPK	Regleta	Taller		1	Ip44 /
SOLERA	Tripleta	Taller		1	Magatzem
MASTERPLUG	Allargo	Taller		1	Magatzem
STAYER	Mola de tall	Taller		1	Magatzem
STAYER2	Disc esmoladora	Taller		1	Magatzem
URKO	Ribot	Taller		1	Magatzem
KENSTON	Xerrac	Taller		1	Magatzem
STANLDLEY	Escairadora amb serra	Taller		1	Magatzem
BELLOTA	Martell Ebanista	Taller		1	Magatzem
TUMANPROFE	Martell de fuster	Taller		1	Magatzem
TUMAN	Maçeta de nylon	Taller		1	Magatzem
KENSTON2	Tornavís estrella	Taller		2	Magatzem
KNIPEX	Tornavís pla	Taller		3	Magatzem
KNIPEX2	Tornavís estrella	Taller		2	Magatzem
KANGTAI	Busca pols	Taller		1	Magatzem
KENSTON3	Maletí d'eines complet	Taller		1	Magatzem
RIMO	Alicates	Taller		1	Magatzem
COGEX	Enformador	Taller		4	Magatzem
DROPFORGED	Clau fixa	Taller		8	Magatzem
LOTU	Tirafondo	Taller		2	Plana estrella /
SPAX	Tirafondo	Taller		2	Z1
LOTU2	Arandela	Taller		1	Cincado /
LOTU3	Rosca (femella)	Taller		1	Cincado /
LOTU4	Cargol	Taller		1	Din 933
TORNILLERI	Tornilleria variada	Taller		1	Magatzem
AMIGMOD3	Escaire angle	Taller		1	80 mm
MASQ	Cinta de pintor	Taller		2	max 60 ºC
3M	Cinta aïllant	Taller		1	Magatzem
INDUSTRIAS	Estant classificador	Taller		2	Magatzem
MEDIDTOOLS	Cutter	Taller		1	Magatzem
STANLEYTYL	Cinta mètrica	Taller		1	Magatzem
KPS	Multímetre digital	Taller		1	Magatzem
KPS2	Pinça amperimètrica digital	Taller		1	Magatzem
DYMOLABELM	Etiquetadora	Taller		1	Magatzem
DYMO	Cartutxos	Taller		1	12mm x 7 m
CABLESYESL	Eslinga plana poliéster	Taller		2	Magatzem
KIPSTA	Bossa instantània de fred	Taller		1	Magatzem
FORCLAZFIR	Farmacional completa	Taller		1	Magatzem
KLIMAX	Mascareta	Taller		1	Magatzem
BOSCH	Medidor Làser Bosch	Taller		1	Magatzem
EDM	Llum Frontal	Taller		1	Magatzem
DCLABPOWER	Fonts alimentació	Taller		1	Magatzem
DCLABPOWER2	Font alimentació	Taller		1	Magatzem
OD600	Oscil·loscopi	Taller		1	Magatzem
JTJDS6600	Generador de funcions	Taller		1	Magatzem
CAIXESDEPR	Caixes de proteccions electriques	Taller		1	Magatzem
MOTORTRIFA	Motor Trifàsic 2,2kw 3cv 1500rpm	Taller		1	Magatzem
TMID18230V	Arranques directes motors trifàsics	Taller		1	Magatzem
KPSMT440	Multímetre	Taller		1	Magatzem
MY63	Multímetre	Taller		1	Magatzem
KPSPA10	Pinça amperimètrica	Taller		1	Magatzem`;
const MALETES = { "MAL-CAM": "Maleta Càmera Blackmagic Cinema", "MAL-SO": "Maleta So (microfonia)", "MAL-LED": "Maleta Llums (panells LED)" };
const CODIS_BARRES = { "ALPHA6700I": "8806094758122", "ZOOMH5": "4515260019177", "FLX4-01": "4988001234567" };
// Incidències d'exemple (a la versió real vindrien de l'historial de devolucions)
const INCIDENCIES_DEMO = {
  "HCX2000": { estat: "Reparació", incidencia: { tipus: "trencat", data: "2026-08-27", per: "Marc Riu", nota: "Pendent de pressupost del servei tècnic." } },
  "EOSR100": { estat: "Perdut", incidencia: { tipus: "perdut", data: "2026-08-25", per: "Grup 2n AV", nota: "" } },
};
const MATERIAL_SEED = [
  ...Object.entries(MALETES).map(([codi, nom]) => ({ codi, nom, cat: "Maletes préstec", marca: "Varis", unitats: 3, ubic: "Magatzem AV", estat: "Disponible", maleta: true, codiBarres: "" })),
  ...INVENTARI_TSV.trim().split("\n").map((l) => {
    const [codi, nom, cat, marca, unitats, ubic] = l.split("\t");
    return { codi, nom, cat, marca: marca || "—", unitats: +unitats || 1, ubic: ubic || "Magatzem", estat: "Disponible", codiBarres: CODIS_BARRES[codi] || "", ...(INCIDENCIES_DEMO[codi] || {}) };
  }),
];

const ESPAIS_SEED = [
  { nom: "Auditori", equipament: "Pantalla LED 7×3, PA Amate, il·luminació LED, motors" },
  { nom: "Taller", equipament: "Escenotècnia, eines" },
  { nom: "Realització ISA0", equipament: "Mescladora ATEM, monitoratge" },
  { nom: "Plató Audiovisual", equipament: "Studio Cameras, croma, il·luminació" },
  { nom: "Estudi So", equipament: "Cabina, taula de so" },
  { nom: "Pòdcast", equipament: "Micròfons, taula, càmeres" },
  { nom: "Locutori 01", equipament: "Cabina de locució" },
  { nom: "Locutori 02", equipament: "Cabina de locució" },
  { nom: "Locutori 03", equipament: "Cabina de locució" },
  { nom: "Tècnica Vocal", equipament: "Piano, equip de so" },
  { nom: "Espectacles", equipament: "Escenari, il·luminació" },
  { nom: "Música Digital + Davinci", equipament: "Estacions d'edició" },
  { nom: "Producció", equipament: "Aula informàtica" },
  { nom: "Teoria TAT", equipament: "Aula teòrica" },
  { nom: "Polivalent 01", equipament: "Equip DJ Pioneer" },
  { nom: "1r BTX AV", equipament: "Aula de grup" },
  { nom: "2n BTX AV", equipament: "Aula de grup" },
  { nom: "1r VDJ", equipament: "Aula de grup" },
  { nom: "2n VDJ", equipament: "Aula de grup" },
  { nom: "1r BTX Escènic", equipament: "Aula de grup" },
  { nom: "2n BTX Escènic", equipament: "Aula de grup" },
  { nom: "Aula Polivalent 2", equipament: "Espai diàfan", foraHorari: true },
  { nom: "Aula Moviment", equipament: "Terra tècnic, miralls", foraHorari: true },
  { nom: "Aula Assaig i Combo", equipament: "Backline, PA, pianos", foraHorari: true },
];

const PROTOCOLS = {
  "Aula Moviment": { max: 15, nota: "Només alumnat de torn de matí. Màxim 15 alumnes.", slots: [
    { dia: "Dilluns", ini: "15:00", fi: "17:50" }, { dia: "Dimecres", ini: "14:10", fi: "16:00" }, { dia: "Dijous", ini: "14:10", fi: "16:55" } ] },
  "Aula Polivalent 2": { max: 4, nota: "Només alumnat de torn de matí. Màxim 4 persones.", slots: [
    { dia: "Dimecres", ini: "15:00", fi: "16:30" }, { dia: "Dimecres", ini: "16:30", fi: "18:00" } ] },
  "Aula Assaig i Combo": { max: 6, nota: "Preferència 1r BTX Arts Escèniques. Màx. 6; només 1 persona externa.", slots: [
    { dia: "Dimecres", ini: "15:00", fi: "16:30" }, { dia: "Dimecres", ini: "16:30", fi: "18:00" }, { dia: "Dimecres", ini: "18:00", fi: "19:30" } ] },
};

const HORARI_LECTIU = [
  { espai: "Plató Audiovisual", dia: "Dilluns", ini: "09:00", fi: "10:50", label: "Presa i edició d'imatge · 1r AV" },
  { espai: "Plató Audiovisual", dia: "Dijous", ini: "11:20", fi: "13:15", label: "Realització · 2n AV" },
  { espai: "Auditori", dia: "Dilluns", ini: "16:00", fi: "17:50", label: "Il·luminació espectacles · AE" },
  { espai: "Polivalent 01", dia: "Dimarts", ini: "12:20", fi: "14:10", label: "So en directe · DJ" },
  { espai: "Estudi So", dia: "Dilluns", ini: "08:00", fi: "10:50", label: "Enregistrament · 2n Sono" },
];

const PROFES_NOMS = ["Klaudia Álvarez", "Albert Anglada", "David Anguera", "David Arnaiz", "Paloma Bañuls", "Joana Castellano", "Mireia Cequiel", "Mercedes Collado", "Toni Contreras", "Eva Cruces", "Mireia Devesa", "Òscar Fernández", "Laura Fité", "Miguel Giménez", "Ada González", "Roger Granel", "Mònica Hernández", "Carmen Jiménez", "David Llamas", "Roberto López", "Meritxell Manyoses", "Albert Martí", "Anna Maria Martínez", "Álex Moreno", "Mònica Moreno", "Mariona Naudín", "David Pagès", "Joan Pedroche", "Tanit Plana", "Míriam Prieto", "Baldesca Punter", "Inma Redón", "Jaume Ricart", "Francesco Sinopoli", "Núria Solé", "Natalia Uviña", "Rubén Ventura", "Albert Villalbí", "Isabel Yuste"];
const PROFES = PROFES_NOMS.map((n) => ({ nom: n, email: correuDe(n) }));
const ASSIGNATURES = ["Presa i edició digital d'imatge", "Creació Fotogràfica i Cinema", "Comunicació Audiovisual", "Projecte Audiovisual 2n BXT", "Realització", "Il·luminació", "So en directe", "Tècnica vocal", "Maquillatge", "Escenografia", "Moviment", "Tecnologia I", "Dibuix Tècnic I", "Música i comunicació"];
const ALUMNES_SEED = [
  { nom: "Laia Ferrer", email: "laia.ferrer@itaeb.cat", grup: "1r BTX AV" },
  { nom: "Marc Riu", email: "marc.riu@itaeb.cat", grup: "2n BTX AV" },
  { nom: "Aina Roca", email: "aina.roca@itaeb.cat", grup: "1r VDJ" },
  { nom: "Pau Grau", email: "pau.grau@itaeb.cat", grup: "2n VDJ" },
  { nom: "Júlia Serra", email: "julia.serra@itaeb.cat", grup: "1r BTX Escènic" },
  { nom: "Nil Camps", email: "nil.camps@itaeb.cat", grup: "2n BTX Escènic" },
];
const ROLS = ["Alumne", "Professor", "Consergeria", "Administrador"];
const nomsDe = (llista) => llista.map((p) => (typeof p === "string" ? p : p.nom));

let _id = 100;
const nextId = () => ++_id;
const pad = (n) => String(n).padStart(2, "0");
const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const avui = () => isoOf(new Date());
function weekDates(baseIso) {
  const d = new Date(baseIso + "T00:00:00"); const off = (d.getDay() + 6) % 7;
  const mon = new Date(d); mon.setDate(d.getDate() - off);
  return [0, 1, 2, 3, 4].map((i) => { const x = new Date(mon); x.setDate(mon.getDate() + i); return isoOf(x); });
}
function nextDateForDay(diaIdx) {
  const t = new Date(avui() + "T00:00:00");
  for (let i = 0; i < 14; i++) { const x = new Date(t); x.setDate(t.getDate() + i); if (((x.getDay() + 6) % 7) === diaIdx) return isoOf(x); }
  return avui();
}
const solapa = (aI, aF, bI, bF) => aI < bF && aF > bI;
const esActiva = (r) => ["pendent", "confirmada", "prestec"].includes(r.estat);

const CURS = { ini: "2026-09-08", fi: "2027-06-21" };
const VACANCES = [
  { ini: "2026-12-22", fi: "2027-01-07", label: "Nadal" },
  { ini: "2027-03-20", fi: "2027-03-29", label: "Setmana Santa" },
];
const FESTIUS = {
  "2026-09-11": "Diada", "2026-09-24": "La Mercè", "2026-10-12": "Festa nacional",
  "2026-10-30": "Lliure disp.", "2026-12-07": "Lliure disp.", "2026-12-08": "Immaculada",
  "2027-05-17": "2a Pasqua",
};
const MESOS = ["gen", "feb", "març", "abr", "maig", "juny", "jul", "ag", "set", "oct", "nov", "des"];
const dfmt = (iso) => `${+iso.slice(8)} ${MESOS[+iso.slice(5, 7) - 1]}`;
function mondayOf(iso) { const d = new Date(iso + "T00:00:00"); const off = (d.getDay() + 6) % 7; d.setDate(d.getDate() - off); return isoOf(d); }
function addDaysIso(iso, n) { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return isoOf(d); }
const clampSetmana = (iso) => { const m = mondayOf(iso), lo = mondayOf(CURS.ini), hi = mondayOf(CURS.fi); return m < lo ? lo : m > hi ? hi : m; };
const INICI_SETMANA = clampSetmana(avui());
function festiu(iso) {
  if (iso < CURS.ini || iso > CURS.fi) return { label: "Fora de curs", tipus: "fora" };
  for (const v of VACANCES) if (iso >= v.ini && iso <= v.fi) return { label: v.label, tipus: "vac" };
  if (FESTIUS[iso]) return { label: FESTIUS[iso], tipus: FESTIUS[iso].startsWith("Lliure") ? "lliure" : "festiu" };
  return null;
}

export default function App() {
  const [sessio, setSessio] = useState(false);
  const [rol, setRol] = useState("Professor");
  const [usuari, setUsuari] = useState("Mireia Devesa");
  const [vista, setVista] = useState("inici");
  const [material, setMaterial] = useState(MATERIAL_SEED);
  const [espais, setEspais] = useState(ESPAIS_SEED);
  const [profes, setProfes] = useState(PROFES);
  const [alumnes, setAlumnes] = useState(ALUMNES_SEED);
  const [assignatures, setAssignatures] = useState(ASSIGNATURES);
  const setmana = weekDates(INICI_SETMANA);
  const [reserves, setReserves] = useState([
    { id: nextId(), tipus: "material", ref: "SONY-A67", refNom: "Sony a6700", quantitat: 1, sol: "Laia Ferrer", rol: "Alumne", professor: "Mireia Devesa", assignatura: "Presa i edició digital d'imatge", data: setmana[0], torn: "mati", ini: "09:00", fi: "10:50", motiu: "Reportatge", estat: "pendent" },
    { id: nextId(), tipus: "material", ref: "FLX4", refNom: "Controladora DDJ-FLX4", quantitat: 4, sol: "Toni Contreras", rol: "Professor", assignatura: "So en directe", data: setmana[1], torn: "mati", ini: "12:20", fi: "14:10", motiu: "Classe DJ", estat: "confirmada" },
    { id: nextId(), tipus: "material", ref: "ZOOM-H5", refNom: "Zoom H5", quantitat: 2, sol: "Núria Solé", rol: "Professor", assignatura: "Comunicació Audiovisual", data: setmana[3], torn: "tarda", ini: "16:00", fi: "17:50", motiu: "So directe", estat: "confirmada" },
    { id: nextId(), tipus: "espai", ref: "Aula Moviment", refNom: "Aula Moviment", persones: 4, sol: "Grup teatre", rol: "Alumne", data: setmana[2], torn: "tarda", ini: "14:10", fi: "16:00", motiu: "Assaig", estat: "pendent", foraHorari: true },
    { id: nextId(), tipus: "material", ref: "STUDIO-G2", refNom: "Blackmagic Studio Camera 4K Plus G2", quantitat: 1, sol: "Pau Grau", rol: "Alumne", professor: "Mireia Devesa", assignatura: "Realització", data: setmana[1], torn: "mati", ini: "11:20", fi: "13:15", motiu: "Pràctica plató", estat: "pendent", origen: "escaneig", lot: "Ldemo" },
    { id: nextId(), tipus: "material", ref: "ZOOM-H5", refNom: "Zoom H5", quantitat: 2, sol: "Pau Grau", rol: "Alumne", professor: "Mireia Devesa", assignatura: "Realització", data: setmana[1], torn: "mati", ini: "11:20", fi: "13:15", motiu: "Pràctica plató", estat: "pendent", origen: "escaneig", lot: "Ldemo" },
    { id: nextId(), tipus: "material", ref: "TRIP-MK290", refNom: "Trípode Manfrotto MK290", quantitat: 1, sol: "Pau Grau", rol: "Alumne", professor: "Mireia Devesa", assignatura: "Realització", data: setmana[1], torn: "mati", ini: "11:20", fi: "13:15", motiu: "Pràctica plató", estat: "pendent", origen: "escaneig", lot: "Ldemo" },
    { id: nextId(), tipus: "material", ref: "ZOOMH5", refNom: "Zoom H5", quantitat: 1, sol: "Aina Roca", rol: "Alumne", professor: "Mireia Devesa", assignatura: "Comunicació Audiovisual", data: setmana[0], torn: "mati", ini: "09:00", fi: "10:50", motiu: "Enregistrament exterior", estat: "prestec" },
    { id: nextId(), tipus: "material", ref: "ALPHA6700I", refNom: "Sony a6700", quantitat: 1, sol: "Aina Roca", rol: "Alumne", professor: "Mireia Devesa", assignatura: "Comunicació Audiovisual", data: setmana[0], torn: "mati", ini: "09:00", fi: "10:50", motiu: "Enregistrament exterior", estat: "prestec", lot: "Lpres" },
    { id: nextId(), tipus: "material", ref: "BGM113A", refNom: "Blackmagic Pocket Cinema 4K", quantitat: 1, sol: "Aina Roca", rol: "Alumne", professor: "Mireia Devesa", assignatura: "Comunicació Audiovisual", data: setmana[0], torn: "mati", ini: "09:00", fi: "10:50", motiu: "Enregistrament exterior", estat: "prestec", lot: "Lpres" },
  ]);
  const [toast, setToast] = useState(null);
  const [scan, setScan] = useState("");
  const [editRes, setEditRes] = useState(null);
  const notifica = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3200); };

  const potAprovar = (r) => {
    if (rol === "Administrador") return true;
    if (r.tipus === "espai" && (rol === "Consergeria" || (rol === "Professor" && !r.foraHorari))) return true;
    if (r.tipus === "material" && (rol === "Professor" || (rol === "Consergeria" && r.origen === "escaneig"))) return true;
    return false;
  };
  const pendents = reserves.filter((r) => r.estat === "pendent");
  const enPrestec = reserves.filter((r) => r.estat === "prestec");
  const pendentsMeus = pendents.filter(potAprovar);
  const prestecMeus = enPrestec.filter(potAprovar);
  const resolReserva = (id, estat) => {
    const e = estat === "confirmada" ? "prestec" : estat;
    setReserves((rs) => rs.map((r) => (r.id === id ? { ...r, estat: e } : r)));
    notifica(e === "prestec" ? "Aprovada. Queda en préstec fins que es registri la devolució." : "Sol·licitud rebutjada. S'ha notificat el sol·licitant.");
  };
  const registrarRetorn = (ids, resultat, motiuInc = "") => {
    setReserves((rs) => rs.map((r) => (ids.includes(r.id) ? { ...r, estat: resultat, retornat: avui(), motiuIncidencia: motiuInc } : r)));
    if (resultat === "retornada") notifica(`Devolució correcta registrada (${ids.length}).`);
    else {
      const afectats = reserves.filter((r) => ids.includes(r.id) && r.tipus === "material");
      const refs = afectats.map((r) => r.ref);
      const nouEstat = resultat === "trencat" ? "Reparació" : "Perdut";
      const inc = { estat: nouEstat, incidencia: { tipus: resultat, data: avui(), per: afectats[0] ? afectats[0].sol : "", nota: motiuInc } };
      setMaterial((ms) => ms.map((m) => (refs.includes(m.codi) ? { ...m, ...inc } : m)));
      notifica(resultat === "trencat" ? "Marcat com a trencat: passa a Reparació." : "Marcat com a desaparegut: passa a Perdut.");
    }
  };
  const resolMolts = (ids, estat) => {
    const e = estat === "confirmada" ? "prestec" : estat;
    setReserves((rs) => rs.map((r) => (ids.includes(r.id) ? { ...r, estat: e } : r)));
    notifica(e === "prestec" ? `Llista aprovada (${ids.length} ítems). En préstec fins a la devolució.` : `Llista rebutjada (${ids.length} ítems).`);
  };
  const updateReserva = (id, patch) => { setReserves((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r))); notifica("Reserva actualitzada."); };
  const anularReserva = (id) => { setReserves((rs) => rs.map((r) => (r.id === id ? { ...r, estat: "anul·lada" } : r))); notifica("Reserva anul·lada. S'ha notificat el sol·licitant."); setEditRes(null); };
  const crearReserva = (nova) => {
    let estat = "pendent";
    if (rol === "Administrador") estat = "confirmada";
    else if (rol === "Professor" && !(nova.tipus === "espai" && nova.foraHorari)) estat = "confirmada";
    else if (rol === "Consergeria" && nova.tipus === "espai") estat = "confirmada";
    const r = { ...nova, id: nextId(), sol: usuari, rol, estat };
    setReserves((rs) => [r, ...rs]);
    notifica(estat === "confirmada" ? "Reserva confirmada." : "Sol·licitud enviada. Pendent d'aprovació.");
    setVista(nova.tipus === "espai" ? "espais" : "material");
  };
  const crearReserves = (llista, comuns, origen) => {
    const estat = rol === "Alumne" ? "pendent" : "confirmada";
    const lot = "L" + nextId();
    const noves = llista.map((it) => ({ tipus: "material", ref: it.codi, refNom: it.nom, quantitat: it.q || 1, ...comuns, foraHorari: !!it.maleta, origen, lot, id: nextId(), sol: usuari, rol, estat }));
    setReserves((rs) => [...noves, ...rs]);
    notifica(rol === "Alumne" ? `Enviat a validar (${noves.length} ítems).` : `Reserva confirmada (${noves.length} ítems).`);
  };

  const gestor = rol === "Administrador" || rol === "Consergeria";
  const incidencies = material.filter((m) => m.estat === "Reparació" || m.estat === "Perdut");

  if (!sessio) return (<div className="app"><style>{css}</style><Login onEntrar={() => setSessio(true)} /></div>);

  return (
    <div className="app">
      <style>{css}</style>
      <header className="top">
        <div className="brand"><Cub /><div><div className="brand-t">ITAEB · Reserves</div><div className="brand-s">Material i espais</div></div></div>
        <div className="whoami">
          <span className="who-name">{usuari}</span>
          <select value={rol} onChange={(e) => { const nr = e.target.value; setRol(nr); setUsuari(nr === "Alumne" ? "Laia Ferrer" : nr === "Consergeria" ? "Consergeria" : nr === "Administrador" ? "Direcció tècnica" : "Mireia Devesa"); if (((nr === "Alumne" || nr === "Professor") && (vista === "admin" || vista === "persones")) || (nr === "Alumne" && (vista === "espais" || vista === "reparacions"))) setVista("inici"); }}>
            {ROLS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <button className="sortir" title="Tanca la sessió" onClick={() => setSessio(false)}>Surt</button>
        </div>
      </header>
      <nav className="tabs">
        {[["inici", "Inici"], ["material", "Reserva de material"], ["escaneig", "Reserva per escaneig"], ...(rol !== "Alumne" ? [["espais", "Reserva d'espais"]] : []), ["fora", "Fora d'horari"],
          ["sol.licituds", `Sol·licituds${pendentsMeus.length + prestecMeus.length ? ` (${pendentsMeus.length + prestecMeus.length})` : ""}`],
          ...(rol !== "Alumne" ? [["reparacions", `Reparacions${incidencies.length ? ` (${incidencies.length})` : ""}`]] : []), ["historial", "Historial"],
          ...(gestor ? [["admin", "Dades"], ["persones", "Edició pestanyes"]] : [])].map(([k, l]) => (
          <button key={k} className={vista === k ? "tab on" : "tab"} onClick={() => setVista(k)}>{l}</button>
        ))}
      </nav>
      <main className="main">
        {vista === "inici" && <Inici {...{ reserves, rol }} />}
        {vista === "material" && <Material {...{ material, reserves, crearReserves, rol, usuari, profes, alumnes, assignatures, scan, setScan, notifica }} />}
        {vista === "espais" && rol !== "Alumne" && <Espais {...{ espais, reserves, crearReserva, rol, usuari, profes, assignatures }} />}
        {vista === "fora" && <ForaHorari {...{ espais, material, reserves, crearReserva, rol, usuari, profes, assignatures }} />}
        {vista === "escaneig" && <Escaneig {...{ material, reserves, crearReserves, rol, usuari, profes, alumnes, assignatures, notifica }} />}
        {vista === "sol.licituds" && <Solicituds {...{ pendents, enPrestec, potAprovar, resolReserva, resolMolts, registrarRetorn, rol }} />}
        {vista === "reparacions" && rol !== "Alumne" && <Reparacions {...{ incidencies, setMaterial, notifica }} />}
        {vista === "historial" && <Historial reserves={reserves} onEdit={setEditRes} />}
        {vista === "admin" && gestor && <Admin {...{ material, setMaterial, notifica }} />}
        {vista === "persones" && gestor && <Persones {...{ profes, setProfes, alumnes, setAlumnes, assignatures, setAssignatures, espais, setEspais, notifica, rol }} />}
      </main>
      {editRes && <EditReserva r={editRes} onClose={() => setEditRes(null)} onSave={(patch) => { updateReserva(editRes.id, patch); setEditRes(null); }} onAnular={() => anularReserva(editRes.id)} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

/* ---------------- LOGIN ---------------- */
function Login({ onEntrar }) {
  const [carregant, setCarregant] = useState(false);
  const [correu, setCorreu] = useState("");
  const [error, setError] = useState("");
  const [mostraAlt, setMostraAlt] = useState(false);

  const entrarGoogle = () => {
    setCarregant(true); setError("");
    // A producció: supabase.auth.signInWithOAuth({ provider:'google', options:{ queryParams:{ hd:'itaeb.cat' } } })
    setTimeout(() => { setCarregant(false); onEntrar(); }, 900);
  };
  const entrarCorreu = () => {
    const c = correu.trim().toLowerCase();
    if (!c.endsWith("@itaeb.cat")) { setError("Cal un compte del centre acabat en @itaeb.cat"); return; }
    setError(""); onEntrar();
  };

  return (
    <div className="login">
      <aside className="login-brand">
        <LogoITAEB size={190} />
        <div className="login-claim">
          <h2>Reserves de material i espais</h2>
          <p>Càmeres, so, il·luminació i aules del centre, en un sol lloc.</p>
        </div>
        <div className="login-peu">Curs 2026-27</div>
      </aside>

      <main className="login-form">
        <div className="login-box">
          <h1>Entra al teu compte</h1>
          <p className="login-sub">Fes servir el compte del centre. No cal registrar-s'hi: el primer cop que entris, el teu compte es crea automàticament.</p>

          <button className="btn-google" onClick={entrarGoogle} disabled={carregant}>
            <svg width="19" height="19" viewBox="0 0 48 48" aria-hidden>
              <path fill="#4285F4" d="M45 24c0-1.6-.1-2.7-.4-3.9H24v7.1h12c-.2 1.9-1.5 4.7-4.4 6.6l6.7 5.2C42.2 35.6 45 30.3 45 24z" />
              <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.4c-1.8 1.3-4.3 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.900l-7.1 5.5C8.1 40.9 15.4 46 24 46z" />
              <path fill="#FBBC05" d="M11.5 27.6c-.5-1.4-.7-2.9-.7-4.6s.3-3.2.7-4.6l-7.1-5.5C2.9 16 2 19.9 2 24s.9 8 2.4 11.1l7.1-5.5z" />
              <path fill="#EA4335" d="M24 10.3c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 4.1 29.9 2 24 2 15.4 2 8.1 7.1 4.4 14.4l7.1 5.5C13.3 14.1 18.2 10.3 24 10.3z" />
            </svg>
            {carregant ? "Connectant…" : "Entra amb Google"}
          </button>

          <div className="login-dom"><b>Només comptes @itaeb.cat</b> · alumnat, professorat, consergeria i direcció</div>

          <div className="login-sep"><span>o bé</span></div>

          {!mostraAlt ? (
            <button className="login-link" onClick={() => setMostraAlt(true)}>Entra amb correu i contrasenya</button>
          ) : (
            <div className="login-alt">
              <Camp l="Correu del centre">
                <input type="email" placeholder="nom@itaeb.cat" value={correu}
                  onChange={(e) => { setCorreu(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && entrarCorreu()} />
              </Camp>
              <Camp l="Contrasenya"><input type="password" placeholder="••••••••" onKeyDown={(e) => e.key === "Enter" && entrarCorreu()} /></Camp>
              {error && <p className="login-err">{error}</p>}
              <button className="btn prim" style={{ width: "100%" }} onClick={entrarCorreu}>Entra</button>
              <button className="login-link" style={{ marginTop: 10 }} onClick={() => setMostraAlt(false)}>Torna</button>
            </div>
          )}

          <p className="login-ajuda">Has perdut l'accés al teu compte del centre? Escriu a <b>consergeria@itaeb.cat</b>.</p>
        </div>
        <footer className="login-foot">Institut de Tècniques Audiovisuals i de l'Espectacle de Barcelona</footer>
      </main>
    </div>
  );
}

/* ---------- Navegació de setmanes ---------- */
function useSetmana() {
  const [base, setBase] = useState(INICI_SETMANA);
  const loMon = mondayOf(CURS.ini), hiMon = mondayOf(CURS.fi);
  const shift = (n) => setBase((b) => { const nb = addDaysIso(b, n * 7); return nb < loMon ? loMon : nb > hiMon ? hiMon : nb; });
  return { dates: weekDates(base), base, shift, anar: () => setBase(INICI_SETMANA), canPrev: base > loMon, canNext: base < hiMon };
}
function WeekNav({ wk }) {
  return (
    <div className="weeknav">
      <button className="wbtn" disabled={!wk.canPrev} onClick={() => wk.shift(-1)} aria-label="Setmana anterior">‹</button>
      <div className="wlabel">{dfmt(wk.dates[0])} – {dfmt(wk.dates[4])} {wk.dates[4].slice(0, 4)}</div>
      <button className="wbtn" disabled={!wk.canNext} onClick={() => wk.shift(1)} aria-label="Setmana següent">›</button>
      <button className="wtoday" onClick={wk.anar}>Avui</button>
    </div>
  );
}

/* ---------- Reixa setmanal ---------- */
function WeekGrid({ entriesFor, hintFor, onCell, clickable, dates, holidayOf, compact }) {
  const canClick = (di, f) => !!onCell && (!clickable || clickable(di, f));
  const holi = (di) => (dates && holidayOf ? holidayOf(dates[di]) : null);
  return (
    <div className={"gridwrap" + (compact ? " compact" : "")}>
      <table className="week">
        <thead><tr><th className="hcol">Hora</th>{DIES.map((d, di) => {
          const iso = dates ? dates[di] : null; const h = holi(di);
          return (
            <th key={d} className={h ? "festiu-h " + h.tipus : ""}>
              <div className="thn">{compact ? d.slice(0, 2) : d}</div>
              {iso && <div className="thd">{(+iso.slice(8)) + "/" + (+iso.slice(5, 7))}</div>}
              {h && <div className="thf">{h.label}</div>}
            </th>
          );
        })}</tr></thead>
        <tbody>
          {FRANGES.map((f) => (
            <tr key={f.ini} className={f.pati ? "pati" : f.migdia ? "migdia" : ""}>
              <td className="hcol">{f.ini}<span className="fdash">–{f.fi}</span></td>
              {f.pati || f.migdia
                ? DIES.map((d, di) => <td key={d} className={"brk" + (holi(di) ? " festiu " + holi(di).tipus : "")}>{f.pati ? "Pati" : "—"}</td>)
                : DIES.map((d, di) => {
                  const h = holi(di);
                  if (h) return <td key={d} className={"festiu " + h.tipus}></td>;
                  const es = entriesFor(di, f);
                  const hint = hintFor && hintFor(di, f);
                  const clic = canClick(di, f);
                  return (
                    <td key={d} className={(hint ? "reservable " : "") + (clic ? "clik" : "")} onClick={clic ? () => onCell(di, f) : undefined}>
                      {es.map((e, i) => <span key={i} className="chip" style={{ borderColor: e.color, color: e.color }}>{e.label}</span>)}
                      {clic && es.length === 0 && <span className="lliure">{hint ? "Reservable +" : "+"}</span>}
                    </td>
                  );
                })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- INICI ---------------- */
function Inici({ reserves, rol }) {
  const wk = useSetmana();
  const perDia = useMemo(() => {
    const mat = wk.dates.map(() => []); const esp = wk.dates.map(() => []);
    for (const r of reserves) {
      if (!esActiva(r)) continue;
      const di = wk.dates.indexOf(r.data);
      if (di < 0) continue;
      (r.tipus === "material" ? mat : esp)[di].push(r);
    }
    return { mat, esp };
  }, [reserves, wk.dates]);
  const matFor = (di, f) => perDia.mat[di].filter((r) => solapa(r.ini, r.fi, f.ini, f.fi))
    .map((r) => ({ label: `${r.refNom}${r.quantitat ? " ×" + r.quantitat : ""}`, color: r.estat === "confirmada" ? BRAND.blau : BRAND.groc }));
  const espFor = (di, f) => perDia.esp[di].filter((r) => solapa(r.ini, r.fi, f.ini, f.fi))
    .map((r) => ({ label: `${r.ref} · ${r.sol}`, color: r.estat === "confirmada" ? BRAND.blau : BRAND.groc }));
  return (
    <div>
      <div className="hero">
        <h1>Bon dia, {rol === "Alumne" ? "Laia" : "equip"}.</h1>
        <p>Resum setmanal sobre l'horari del centre. Mou-te pel curs 2026-27 amb les fletxes; els festius apareixen marcats.</p>
      </div>
      <div className="legend"><span><i style={{ background: BRAND.blau }} /> Confirmada</span><span><i style={{ background: BRAND.groc }} /> Pendent</span><span><i style={{ background: "#fbeaea" }} /> Festiu</span><span><i style={{ background: "#eef2fb" }} /> Vacances</span></div>
      <WeekNav wk={wk} />
      <div className="dualcal">
        <div className="calcol">
          <h2 className="h2">Reserves de material</h2>
          <WeekGrid entriesFor={matFor} dates={wk.dates} holidayOf={festiu} compact />
        </div>
        <div className="calcol">
          <h2 className="h2">Reserves d'espais</h2>
          <WeekGrid entriesFor={espFor} dates={wk.dates} holidayOf={festiu} compact />
        </div>
      </div>
    </div>
  );
}

/* ---------------- MATERIAL (llista) ---------------- */
const MRow = memo(function MRow({ m, lliures, onAdd }) {
  const rep = m.estat === "Reparació" || m.estat === "Perdut";
  const bloq = rep || lliures === 0;
  return (
    <button className={"mrow" + (bloq ? " rep" : "")} onClick={() => !bloq && onAdd(m)}>
      <span className="mcodi">{m.codi}</span>
      <span className="mnom">{m.nom}<span className="mmeta"> · {m.marca} · {m.ubic}{m.maleta ? " · préstec fora d'horari" : ""}</span></span>
      <span className="mstock"><b style={{ color: lliures ? BRAND.blau : BRAND.vermell }}>{lliures}</b>/{m.unitats}</span>
      <Estat estat={rep ? m.estat : lliures > 0 ? "Disponible" : "Prestat"} />
    </button>
  );
});

const LlistaMaterial = memo(function LlistaMaterial({ material, ocupacio, onAdd, cerca, cat }) {
  const visibles = useMemo(() => {
    const q = cerca.trim().toLowerCase();
    let base = cat === "*" ? material : material.filter((m) => m.cat === cat);
    if (q) base = base.filter((m) => m.nom.toLowerCase().includes(q) || m.codi.toLowerCase().includes(q) || (m.marca || "").toLowerCase().includes(q));
    return base;
  }, [material, cerca, cat]);
  const [limit, setLimit] = useState(60);
  useEffect(() => { setLimit(60); }, [cerca, cat]);
  const mostra = visibles.slice(0, limit);
  const grups = useMemo(() => {
    const g = new Map();
    mostra.forEach((m) => { if (!g.has(m.cat)) g.set(m.cat, []); g.get(m.cat).push(m); });
    return [...g.entries()];
  }, [mostra]);
  return (
    <>
      <p className="nota">{visibles.length} referències{visibles.length > limit ? ` · mostrant-ne ${limit}` : ""}. Toca un material per afegir-lo a la cistella.</p>
      {grups.map(([c, items]) => (
        <div key={c} className="catblock">
          <div className="cat-t">{c}</div>
          <div className="mlist">
            {items.map((m) => <MRow key={m.codi} m={m} lliures={Math.max(0, m.unitats - (ocupacio.get(m.codi) || 0))} onAdd={onAdd} />)}
          </div>
        </div>
      ))}
      {visibles.length > limit && (
        <button className="btn ghost" style={{ width: "100%", marginTop: 12 }} onClick={() => setLimit((l) => l + 120)}>
          Mostra'n més ({visibles.length - limit} restants)
        </button>
      )}
      {visibles.length === 0 && <Buit>Cap material coincideix amb la cerca.</Buit>}
    </>
  );
});

function Material({ material, reserves, crearReserves, rol, usuari, profes, alumnes, assignatures, scan, setScan, notifica }) {
  const ocupacio = useMemo(() => {
    const idx = new Map();
    for (const r of reserves) if (r.tipus === "material" && esActiva(r)) idx.set(r.ref, (idx.get(r.ref) || 0) + (r.quantitat || 1));
    return idx;
  }, [reserves]);
  const cats = useMemo(() => [...new Set(material.map((m) => m.cat))], [material]);
  const lliuresDe = useCallback((m) => Math.max(0, m.unitats - (ocupacio.get(m.codi) || 0)), [ocupacio]);
  const [cerca, setCerca] = useState("");
  const [catSel, setCatSel] = useState("*");
  const [cart, setCart] = useState([]);
  const [data, setData] = useState(avui());
  const [torn, setTorn] = useState("mati");
  const [ini, setIni] = useState("09:00");
  const [fi, setFi] = useState("10:50");
  const [assig, setAssig] = useState(assignatures[0]);
  const [profs, setProfs] = useState([]);
  const [profsRec, setProfsRec] = useState([]);
  const [respAlumne, setRespAlumne] = useState(null);
  const [motiu, setMotiu] = useState("");
  const esAlumne = rol === "Alumne";

  const afegir = useCallback((m) => {
    const max = Math.max(0, m.unitats - (ocupacio.get(m.codi) || 0));
    if (max <= 0) return notifica("Sense unitats lliures.");
    setCart((C) => { const i = C.findIndex((x) => x.codi === m.codi); if (i >= 0) { const c = [...C]; c[i] = { ...c[i], q: Math.min(max, c[i].q + 1) }; return c; } return [...C, { codi: m.codi, nom: m.nom, maleta: !!m.maleta, q: 1, max }]; });
    notifica(`Afegit a la cistella: ${m.codi}`);
  }, [ocupacio, notifica]);
  const setQ = (codi, q) => setCart((C) => C.map((x) => (x.codi === codi ? { ...x, q: Math.max(1, Math.min(x.max, q)) } : x)));
  const treu = (codi) => setCart((C) => C.filter((x) => x.codi !== codi));
  const total = cart.reduce((a, x) => a + x.q, 0);
  const enviar = () => {
    if (!cart.length) return notifica("La cistella és buida.");
    if (esAlumne && !profs.length) return notifica("Indica com a mínim un professor/a.");
    crearReserves(cart, { data, torn, ini, fi, assignatura: assig, professors: profs, professor: profs[0] || "", profsRecollida: profsRec, responsable: respAlumne || undefined, motiu });
    setCart([]); setMotiu(""); setRespAlumne(null);
  };
  const ferScan = () => {
    let q = scan.trim(); if (q.toUpperCase().startsWith(QR_PREFIX)) q = q.slice(QR_PREFIX.length); q = q.toLowerCase();
    const m = material.find((x) => x.codi.toLowerCase() === q || (x.codiBarres && x.codiBarres.toLowerCase() === q));
    if (m) afegir(m); else notifica("Codi no trobat a l'inventari.");
    setScan("");
  };

  return (
    <div className="cartcols">
      <div>
        <div className="rowhead">
          <h2 className="h2">Inventari de material</h2>
          <div className="scan"><span className="scan-ic">▣</span>
            <input placeholder="CODI o codi de barres…" value={scan} onChange={(e) => setScan(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ferScan()} />
            <button onClick={ferScan}>Afegeix</button></div>
        </div>
        <div className="filtres">
          <input className="cercabox" placeholder="Cerca per nom, codi o marca…" value={cerca} onChange={(e) => setCerca(e.target.value)} />
          <select value={catSel} onChange={(e) => setCatSel(e.target.value)}>
            <option value="*">Totes les categories</option>
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <LlistaMaterial material={material} ocupacio={ocupacio} onAdd={afegir} cerca={cerca} cat={catSel} />
      </div>
      <aside className="cart">
        <div className="cart-h">Cistella ({total})</div>
        <div className="mlist">
          {cart.length === 0 && <div className="buit" style={{ border: 0 }}>Afegeix material tocant-lo a la llista.</div>}
          {cart.map((it) => (
            <div key={it.codi} className="elrow">
              <span className="mnom" style={{ flex: 1 }}>{it.nom}<span className="mmeta"> · {it.codi}</span></span>
              <span className="lqty"><button className="qbtn" onClick={() => setQ(it.codi, it.q - 1)}>−</button>{it.q}<button className="qbtn" onClick={() => setQ(it.codi, it.q + 1)}>+</button></span>
              <button className="x" onClick={() => treu(it.codi)}>✕</button>
            </div>
          ))}
        </div>
        {cart.length > 0 && (
          <div className="finalize">
            <Camp l="Assignatura"><select value={assig} onChange={(e) => setAssig(e.target.value)}>{assignatures.map((a) => <option key={a}>{a}</option>)}</select></Camp>
            <ProfPicker profes={profes} sel={profs} setSel={setProfs} label="Professor/a Entrega" />
            <ProfPicker profes={profes} sel={profsRec} setSel={setProfsRec} label="Professor/a Recollida" />
            {!esAlumne && <AlumnePicker alumnes={alumnes} sel={respAlumne} setSel={setRespAlumne} label="Alumne/a responsable de la reserva" />}
            <Camp l="Data"><input type="date" value={data} onChange={(e) => setData(e.target.value)} /></Camp>
            <Camp l="Torn"><select value={torn} onChange={(e) => setTorn(e.target.value)}>{Object.entries(TORNS).map(([k, v]) => <option key={k} value={k}>{v.nom} ({v.rang})</option>)}</select></Camp>
            <div className="camp2"><Camp l="Inici"><input type="time" value={ini} onChange={(e) => setIni(e.target.value)} /></Camp><Camp l="Fi"><input type="time" value={fi} onChange={(e) => setFi(e.target.value)} /></Camp></div>
            <Camp l="Motiu"><textarea rows="2" value={motiu} onChange={(e) => setMotiu(e.target.value)} /></Camp>
            {esAlumne ? <p className="modal-note" style={{ margin: "0 0 10px" }}>Quedarà <b>pendent</b> d'aprovació de {profs.length ? profs.join(", ") : "el professorat indicat"}.</p> : null}
            <button className="btn prim" style={{ width: "100%" }} onClick={enviar}>{esAlumne ? "Envia sol·licitud" : "Confirma reserva"}</button>
          </div>
        )}
      </aside>
    </div>
  );
}

function FormMaterial({ m, rol, usuari, onClose, onSubmit, profes = PROFES, assignatures = ASSIGNATURES }) {
  const [q, setQ] = useState(1);
  const [data, setData] = useState(avui());
  const [torn, setTorn] = useState("mati");
  const [ini, setIni] = useState("09:00");
  const [fi, setFi] = useState("10:50");
  const [motiu, setMotiu] = useState("");
  const [assig, setAssig] = useState(assignatures[0]);
  const [profs, setProfs] = useState([]);
  const [profsRec, setProfsRec] = useState([]);
  const esAlumne = rol === "Alumne";
  return (
    <Modal onClose={onClose} titol={`Reservar · ${m.nom}`}>
      <p className="modal-sub">{m.codi} · {m.marca} · {m.ubic}</p>
      <Camp l="Unitats"><input type="number" min="1" max={m.unitats} value={q} onChange={(e) => setQ(+e.target.value)} /></Camp>
      <Camp l="Assignatura"><select value={assig} onChange={(e) => setAssig(e.target.value)}>{assignatures.map((a) => <option key={a}>{a}</option>)}</select></Camp>
      <ProfPicker profes={profes} sel={profs} setSel={setProfs} label="Professor/a Entrega" />
      <ProfPicker profes={profes} sel={profsRec} setSel={setProfsRec} label="Professor/a Recollida" />
      <Camp l="Data"><input type="date" value={data} onChange={(e) => setData(e.target.value)} /></Camp>
      <Camp l="Torn"><select value={torn} onChange={(e) => setTorn(e.target.value)}>{Object.entries(TORNS).map(([k, v]) => <option key={k} value={k}>{v.nom} ({v.rang})</option>)}</select></Camp>
      <div className="camp2"><Camp l="Inici"><input type="time" value={ini} onChange={(e) => setIni(e.target.value)} /></Camp><Camp l="Fi"><input type="time" value={fi} onChange={(e) => setFi(e.target.value)} /></Camp></div>
      <Camp l="Motiu"><textarea rows="2" value={motiu} placeholder={m.maleta ? "Projecte personal o lectiu…" : "Ús a l'aula…"} onChange={(e) => setMotiu(e.target.value)} /></Camp>
      {esAlumne ? <p className="modal-note">La petició quedarà <b>pendent</b> d'aprovació de {profs.length ? profs.join(", ") : "el professorat indicat"}.</p> : <p className="modal-note">Com a {rol.toLowerCase()}, la reserva es <b>confirma automàticament</b>.</p>}
      <div className="modal-act"><button className="btn ghost" onClick={onClose}>Cancel·la</button>
        <button className="btn prim" onClick={() => onSubmit({ tipus: "material", ref: m.codi, refNom: m.nom, quantitat: q, data, torn, ini, fi, motiu, assignatura: assig, professors: profs, professor: profs[0] || "", profsRecollida: profsRec, foraHorari: !!m.maleta })}>{esAlumne ? "Envia sol·licitud" : "Confirma reserva"}</button>
      </div>
    </Modal>
  );
}

/* ---------------- ESCANEIG (càmera del mòbil) ---------------- */
function Escaneig({ material, reserves, crearReserves, rol, usuari, profes, alumnes, assignatures, notifica }) {
  const videoRef = useRef(null); const streamRef = useRef(null); const rafRef = useRef(0); const lastRef = useRef({ code: "", t: 0 });
  const [estat, setEstat] = useState("init");
  const [msg, setMsg] = useState("Preparant la càmera…");
  const [manual, setManual] = useState("");
  const [llista, setLlista] = useState([]);
  const [data, setData] = useState(avui());
  const [torn, setTorn] = useState("mati");
  const [ini, setIni] = useState("09:00");
  const [fi, setFi] = useState("10:50");
  const [assig, setAssig] = useState(assignatures[0]);
  const [profs, setProfs] = useState([]);
  const [profsRec, setProfsRec] = useState([]);
  const [respAlumne, setRespAlumne] = useState(null);
  const [motiu, setMotiu] = useState("");
  const esAlumne = rol === "Alumne";
  const ocupacio = useMemo(() => {
    const idx = new Map();
    for (const r of reserves) if (r.tipus === "material" && esActiva(r)) idx.set(r.ref, (idx.get(r.ref) || 0) + (r.quantitat || 1));
    return idx;
  }, [reserves]);
  const lliuresDe = (m) => Math.max(0, m.unitats - (ocupacio.get(m.codi) || 0));

  const afegir = (m) => {
    const max = lliuresDe(m);
    if (max <= 0) return notifica("Sense unitats lliures.");
    setLlista((L) => { const idx = L.findIndex((x) => x.codi === m.codi); if (idx >= 0) { const c = [...L]; c[idx] = { ...c[idx], q: Math.min(max, c[idx].q + 1) }; return c; } return [...L, { codi: m.codi, nom: m.nom, maleta: !!m.maleta, q: 1, max }]; });
    notifica(`Afegit a la cistella: ${m.codi}`);
  };
  const trobar = (code) => {
    let c = (code || "").trim(); if (c.toUpperCase().startsWith(QR_PREFIX)) c = c.slice(QR_PREFIX.length); c = c.toLowerCase(); if (!c) return;
    const m = material.find((x) => (x.codiBarres && x.codiBarres.toLowerCase() === c) || x.codi.toLowerCase() === c);
    if (m) afegir(m); else notifica("Codi no associat a cap material.");
  };
  const setQ = (codi, q) => setLlista((L) => L.map((x) => (x.codi === codi ? { ...x, q: Math.max(1, Math.min(x.max || 99, q)) } : x)));
  const treu = (codi) => setLlista((L) => L.filter((x) => x.codi !== codi));
  const total = llista.reduce((a, x) => a + x.q, 0);
  const enviar = () => {
    if (!llista.length) return notifica("La llista és buida.");
    if (esAlumne && !profs.length) return notifica("Indica com a mínim un professor/a.");
    crearReserves(llista, { data, torn, ini, fi, assignatura: assig, professors: profs, professor: profs[0] || "", profsRecollida: profsRec, responsable: respAlumne || undefined, motiu }, "escaneig");
    setLlista([]); setMotiu(""); setRespAlumne(null);
  };

  const atura = () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; } };
  useEffect(() => {
    let cancelled = false; let detector = null;
    async function start() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { setEstat("error"); setMsg("Aquest navegador no permet accedir a la càmera. Fes servir l'entrada manual."); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; try { await videoRef.current.play(); } catch (e) {} }
        setEstat("on");
        if ("BarcodeDetector" in window) {
          setMsg("Enfoca un codi QR o de barres; pots escanejar-ne diversos seguits.");
          detector = new window.BarcodeDetector();
          const loop = async () => {
            if (cancelled || !videoRef.current) return;
            try { const codes = await detector.detect(videoRef.current); if (codes && codes.length) { const val = codes[0].rawValue; const now = Date.now(); if (val !== lastRef.current.code || now - lastRef.current.t > 1500) { lastRef.current = { code: val, t: now }; trobar(val); } } } catch (e) {}
            rafRef.current = requestAnimationFrame(loop);
          };
          rafRef.current = requestAnimationFrame(loop);
        } else { setMsg("La detecció automàtica no està disponible en aquest navegador; escriu o enganxa el codi a sota."); }
      } catch (err) {
        setEstat("error");
        setMsg("No s'ha pogut obrir la càmera (a la previsualització sol estar bloquejada). A l'app instal·lada al mòbil funcionarà; mentrestant, fes servir l'entrada manual o la llista de sota.");
      }
    }
    start();
    return () => { cancelled = true; atura(); };
  }, []);

  const ambCodi = useMemo(() => material.filter((m) => m.codiBarres), [material]);
  return (
    <div>
      <div className="hero small" style={{ borderLeftColor: BRAND.blau }}>
        <h1>Reserva per escaneig</h1>
        <p>Escaneja diversos ítems per fer una llista. {esAlumne ? "Com a alumne, l'envies a validar al professorat, administració o consergeria." : `Com a ${rol.toLowerCase()}, pots convalidar la llista directament.`}</p>
      </div>
      <div className="scancols">
        <div>
          <div className="scanvideo">
            {estat === "on" ? <video ref={videoRef} playsInline muted /> : <div className="scanph">{estat === "error" ? "📷✕" : "📷"}</div>}
            {estat === "on" && <div className="scanframe" />}
          </div>
          <p className={"nota" + (estat === "error" ? " err" : "")} style={{ marginTop: 10 }}>{msg}</p>
          <div className="scan">
            <span className="scan-ic">⌨</span>
            <input placeholder="Introdueix el codi manualment…" value={manual} onChange={(e) => setManual(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (trobar(manual), setManual(""))} />
            <button onClick={() => { trobar(manual); setManual(""); }}>Afegeix</button>
          </div>
          {ambCodi.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div className="cat-t">Materials amb codi associat (prova)</div>
              <div className="mlist">
                {ambCodi.map((m) => (
                  <button key={m.codi} className="mrow" onClick={() => trobar(m.codiBarres)}>
                    <span className="mcodi">{m.codi}</span>
                    <span className="mnom">{m.nom}<span className="mmeta"> · codi {m.codiBarres}</span></span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div>
          <div className="cat-t">Cistella ({total})</div>
          <div className="mlist">
            {llista.length === 0 && <div className="buit" style={{ border: 0 }}>Encara no has escanejat res.</div>}
            {llista.map((it) => (
              <div key={it.codi} className="elrow">
                <span className="mcodi">{it.codi}</span>
                <span className="mnom" style={{ flex: 1 }}>{it.nom}</span>
                <span className="lqty"><button className="qbtn" onClick={() => setQ(it.codi, it.q - 1)}>−</button>{it.q}<button className="qbtn" onClick={() => setQ(it.codi, it.q + 1)}>+</button></span>
                <button className="x" onClick={() => treu(it.codi)}>✕</button>
              </div>
            ))}
          </div>
          {llista.length > 0 && (
            <div className="finalize">
              <Camp l="Assignatura"><select value={assig} onChange={(e) => setAssig(e.target.value)}>{assignatures.map((a) => <option key={a}>{a}</option>)}</select></Camp>
              <ProfPicker profes={profes} sel={profs} setSel={setProfs} label="Professor/a Entrega" />
              <ProfPicker profes={profes} sel={profsRec} setSel={setProfsRec} label="Professor/a Recollida" />
              {!esAlumne && <AlumnePicker alumnes={alumnes} sel={respAlumne} setSel={setRespAlumne} label="Alumne/a responsable de la reserva" />}
              <Camp l="Data"><input type="date" value={data} onChange={(e) => setData(e.target.value)} /></Camp>
              <Camp l="Torn"><select value={torn} onChange={(e) => setTorn(e.target.value)}>{Object.entries(TORNS).map(([k, v]) => <option key={k} value={k}>{v.nom} ({v.rang})</option>)}</select></Camp>
              <div className="camp2"><Camp l="Inici"><input type="time" value={ini} onChange={(e) => setIni(e.target.value)} /></Camp><Camp l="Fi"><input type="time" value={fi} onChange={(e) => setFi(e.target.value)} /></Camp></div>
              <Camp l="Motiu"><textarea rows="2" value={motiu} onChange={(e) => setMotiu(e.target.value)} /></Camp>
              <button className="btn prim" style={{ width: "100%" }} onClick={enviar}>{esAlumne ? "Envia a validar" : "Confirma la llista (convalida)"}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- ESPAIS ---------------- */
function Espais({ espais, reserves, crearReserva, rol, usuari, profes, assignatures }) {
  const wk = useSetmana();
  const [selNom, setSelNom] = useState(espais.length ? espais[0].nom : "");
  const [obrirForm, setObrirForm] = useState(false);
  const [preset, setPreset] = useState(null);
  const sel = espais.length ? (espais.find((e) => e.nom === selNom) || espais[0]) : null;
  const nomSel = sel ? sel.nom : "";
  const dadesEspai = useMemo(() => {
    const lect = DIES.map((dia) => HORARI_LECTIU.filter((h) => h.espai === nomSel && h.dia === dia));
    const res = wk.dates.map((d) => reserves.filter((r) => r.tipus === "espai" && r.ref === nomSel && r.data === d && esActiva(r)));
    return { lect, res };
  }, [nomSel, reserves, wk.dates]);
  if (!sel) return <Buit>No hi ha espais. Afegeix-ne des d'"Edició pestanyes".</Buit>;
  const proto = PROTOCOLS[sel.nom];
  const entriesFor = (di, f) => [
    ...dadesEspai.lect[di].filter((h) => solapa(h.ini, h.fi, f.ini, f.fi)).map((h) => ({ label: h.label, color: BRAND.negre })),
    ...dadesEspai.res[di].filter((r) => solapa(r.ini, r.fi, f.ini, f.fi)).map((r) => ({ label: `${r.sol} · ${r.motiu || "reserva"}`, color: r.estat === "confirmada" ? BRAND.blau : BRAND.groc })),
  ];
  const hintFor = proto ? (di, f) => proto.slots.some((s) => s.dia === DIES[di] && solapa(s.ini, s.fi, f.ini, f.fi)) : null;
  const clickable = proto ? hintFor : () => true;
  const onCell = (di, f) => {
    if (proto) { const idx = proto.slots.findIndex((s) => s.dia === DIES[di] && solapa(s.ini, s.fi, f.ini, f.fi)); if (idx < 0) return; setPreset({ slotIdx: idx }); }
    else setPreset({ data: wk.dates[di], ini: f.ini, fi: f.fi });
    setObrirForm(true);
  };

  return (
    <div className="espais-layout">
      <aside className="espais-side">
        {espais.map((e) => (
          <button key={e.nom} className={"espai-row" + (e.nom === selNom ? " on" : "")} onClick={() => { setSelNom(e.nom); setObrirForm(false); }}>
            <span className="espai-nom">{e.nom}</span>
            {e.foraHorari && <span className="badge" style={{ background: BRAND.groc }}>Fora horari</span>}
          </button>
        ))}
      </aside>
      <section className="espais-detail">
        <div className="rowhead">
          <div><h2 className="h2" style={{ margin: "2px 0 2px" }}>{sel.nom}</h2><div className="card-meta">{sel.equipament}{sel.foraHorari ? " · reservable fora d'horari" : ""}</div></div>
          <button className="btn prim" onClick={() => { setPreset(null); setObrirForm(true); }}>Reservar</button>
        </div>
        <div className="legend">
          <span><i style={{ background: BRAND.negre }} /> Lectiu</span>
          <span><i style={{ background: BRAND.blau }} /> Confirmada</span>
          <span><i style={{ background: BRAND.groc }} /> Pendent</span>
          {proto && <span><i style={{ background: "#fdf0c9", border: "1px solid " + BRAND.groc }} /> Franja reservable</span>}
        </div>
        <p className="nota" style={{ margin: "0 0 8px" }}>Clica una franja per reservar-hi{proto ? " (només les marcades)" : ""}, o fes servir el botó Reservar.</p>
        <WeekNav wk={wk} />
        <WeekGrid entriesFor={entriesFor} hintFor={hintFor} onCell={onCell} clickable={clickable} dates={wk.dates} holidayOf={festiu} />
        {proto
          ? <p className="nota" style={{ marginTop: 10 }}>Fora d'horari només es pot reservar a les franges marcades. {proto.nota}</p>
          : <p className="nota" style={{ marginTop: 10 }}>Horari lectiu d'exemple: s'omplirà des del full d'horaris del centre.</p>}
        {obrirForm && <FormEspai e={sel} rol={rol} usuari={usuari} preset={preset} profes={profes} assignatures={assignatures} onClose={() => setObrirForm(false)} onSubmit={crearReserva} />}
      </section>
    </div>
  );
}

function FormEspai({ e, rol, usuari, preset, onClose, onSubmit, profes = PROFES, assignatures = ASSIGNATURES }) {
  const proto = PROTOCOLS[e.nom];
  const fora = !!proto;
  const esAlumne = rol === "Alumne";
  const initSlot = fora ? (preset?.slotIdx ?? 0) : 0;
  const [slotIdx, setSlotIdx] = useState(initSlot);
  const slot = fora ? proto.slots[slotIdx] : null;
  const [data, setData] = useState(fora ? nextDateForDay(DIES.indexOf(proto.slots[initSlot].dia)) : (preset?.data ?? avui()));
  const [ini, setIni] = useState(fora ? proto.slots[initSlot].ini : (preset?.ini ?? "09:00"));
  const [fi, setFi] = useState(fora ? proto.slots[initSlot].fi : (preset?.fi ?? "10:50"));
  const [persones, setPersones] = useState(2);
  const [periodica, setPeriodica] = useState(false);
  const [motiu, setMotiu] = useState("");
  const [assig, setAssig] = useState(assignatures[0]);
  const [profs, setProfs] = useState([]);
  const triaSlot = (idx) => { setSlotIdx(idx); const s = proto.slots[idx]; setIni(s.ini); setFi(s.fi); setData(nextDateForDay(DIES.indexOf(s.dia))); };
  return (
    <Modal onClose={onClose} titol={`Reservar · ${e.nom}`}>
      <p className="modal-sub">{e.equipament}</p>
      <Camp l="Assignatura"><select value={assig} onChange={(ev) => setAssig(ev.target.value)}>{assignatures.map((a) => <option key={a}>{a}</option>)}</select></Camp>
      <ProfPicker profes={profes} sel={profs} setSel={setProfs} label="Professor/a Entrega" />
      {fora ? (
        <>
          <Camp l="Franja disponible (segons protocol)">
            <select value={slotIdx} onChange={(ev) => triaSlot(+ev.target.value)}>
              {proto.slots.map((s, i) => <option key={i} value={i}>{s.dia} · {s.ini}–{s.fi}</option>)}
            </select>
          </Camp>
          <Camp l={`Data (${slot.dia})`}><input type="date" value={data} onChange={(ev) => setData(ev.target.value)} /></Camp>
          <Camp l={`Persones (màx. ${proto.max})`}><input type="number" min="1" max={proto.max} value={persones} onChange={(ev) => setPersones(Math.min(proto.max, +ev.target.value))} /></Camp>
        </>
      ) : (
        <>
          <Camp l="Data"><input type="date" value={data} onChange={(ev) => setData(ev.target.value)} /></Camp>
          <div className="camp2"><Camp l="Inici"><input type="time" value={ini} onChange={(ev) => setIni(ev.target.value)} /></Camp><Camp l="Fi"><input type="time" value={fi} onChange={(ev) => setFi(ev.target.value)} /></Camp></div>
          <label className="check"><input type="checkbox" checked={periodica} onChange={(ev) => setPeriodica(ev.target.checked)} /> Reserva periòdica (mateixa franja cada setmana)</label>
        </>
      )}
      <Camp l="Motiu"><textarea rows="2" value={motiu} onChange={(ev) => setMotiu(ev.target.value)} /></Camp>
      {fora ? <p className="modal-note">Espai <b>fora d'horari</b>: requereix aprovació de consergeria/administració. {proto.nota}</p>
        : (esAlumne ? <p className="modal-note">Com a alumne no pots reservar espais dins d'horari lectiu. Contacta amb el professorat.</p> : <p className="modal-note">El professorat de l'assignatura confirma la reserva automàticament.</p>)}
      <div className="modal-act"><button className="btn ghost" onClick={onClose}>Cancel·la</button>
        <button className="btn prim" disabled={!fora && esAlumne} onClick={() => onSubmit({ tipus: "espai", ref: e.nom, refNom: e.nom + (periodica ? " (setmanal)" : ""), persones: fora ? persones : undefined, data, torn: ini < "15:00" ? "mati" : "tarda", ini, fi, motiu, assignatura: assig, professors: profs, professor: profs[0] || "", foraHorari: fora })}>{rol === "Professor" && !fora ? "Confirma reserva" : "Envia sol·licitud"}</button>
      </div>
    </Modal>
  );
}

/* ---------------- FORA D'HORARI ---------------- */
function ForaHorari({ espais, material, reserves, crearReserva, rol, usuari, profes, assignatures }) {
  const aules = useMemo(() => espais.filter((e) => e.foraHorari), [espais]);
  const maletes = useMemo(() => material.filter((m) => m.maleta), [material]);
  const ocupacioFora = useMemo(() => {
    const idx = new Map();
    for (const r of reserves) if (esActiva(r)) idx.set(r.ref, (idx.get(r.ref) || 0) + (r.quantitat || 1));
    return idx;
  }, [reserves]);
  const [sel, setSel] = useState(null);
  const [selM, setSelM] = useState(null);
  return (
    <div>
      <div className="hero small" style={{ borderLeftColor: BRAND.groc }}>
        <h1>Reserves fora d'horari lectiu</h1>
        <p>Per a projectes personals i lectius. Espais: només a les franges dels protocols, aprovades per consergeria. Maletes: validades pel tutor/professor.</p>
      </div>
      <h2 className="h2">Aules disponibles fora d'horari</h2>
      <div className="grid">
        {aules.map((e) => {
          const p = PROTOCOLS[e.nom];
          return (
            <button key={e.nom} className="card" onClick={() => setSel(e)}>
              <div className="card-top"><span className="codi">Aula</span>{p && <span className="badge" style={{ background: BRAND.groc }}>Màx. {p.max}</span>}</div>
              <div className="card-nom">{e.nom}</div>
              <div className="card-meta">{p ? p.slots.map((s) => `${s.dia.slice(0, 3)} ${s.ini}`).join(" · ") : "Sense franges de protocol definides"}</div>
            </button>
          );
        })}
      </div>
      <h2 className="h2" style={{ marginTop: 26 }}>Maletes en préstec (3 de cada)</h2>
      <div className="grid">
        {maletes.map((m) => {
          const lliures = Math.max(0, m.unitats - (ocupacioFora.get(m.codi) || 0));
          return (
            <button key={m.codi} className="card" onClick={() => setSelM(m)}>
              <div className="card-top"><span className="codi">{m.codi}</span><Estat estat={lliures ? "Disponible" : "Prestat"} /></div>
              <div className="card-nom">{m.nom}</div><div className="stock"><b style={{ color: lliures ? BRAND.blau : BRAND.vermell }}>{lliures}</b> / {m.unitats} lliures</div>
            </button>
          );
        })}
      </div>
      {sel && <FormEspai e={sel} rol={rol} usuari={usuari} profes={profes} assignatures={assignatures} onClose={() => setSel(null)} onSubmit={crearReserva} />}
      {selM && <FormMaterial m={selM} rol={rol} usuari={usuari} profes={profes} assignatures={assignatures} onClose={() => setSelM(null)} onSubmit={crearReserva} />}
    </div>
  );
}

/* ---------------- SOL·LICITUDS ---------------- */
function Solicituds({ pendents, enPrestec, potAprovar, resolReserva, resolMolts, registrarRetorn, rol }) {
  const meves = pendents.filter(potAprovar);
  const altres = pendents.filter((r) => !potAprovar(r));
  const grups = []; const perLot = {};
  meves.forEach((r) => {
    if (r.lot) { if (!perLot[r.lot]) { perLot[r.lot] = { lot: r.lot, items: [] }; grups.push(perLot[r.lot]); } perLot[r.lot].items.push(r); }
    else grups.push({ lot: null, items: [r] });
  });
  return (
    <div>
      <h2 className="h2">Sol·licituds pendents</h2>
      <p className="nota">Com a <b>{rol}</b> pots resoldre {meves.length} sol·licitud(s). Les llistes es poden aprovar senceres o ítem per ítem.</p>
      <div className="list">
        {grups.map((g) => {
          if (g.items.length > 1) {
            const first = g.items[0]; const ids = g.items.map((x) => x.id);
            return (
              <div key={g.lot} className="lot">
                <div className="lot-h">
                  <div className="lot-t">Llista de {first.sol} · {first.data} · {first.ini}–{first.fi}{first.assignatura ? ` · ${first.assignatura}` : ""}{(first.professors && first.professors.length) ? ` · ${first.professors.join(", ")}` : first.professor ? ` · ${first.professor}` : ""}<span className="lot-n">{g.items.length} ítems</span></div>
                  <div className="sol-act"><button className="btn danger-ghost sm" onClick={() => resolMolts(ids, "rebutjada")}>Rebutja tota</button><button className="btn prim sm" onClick={() => resolMolts(ids, "confirmada")}>Aprova tota la llista</button></div>
                </div>
                {g.items.map((r) => (
                  <div key={r.id} className="lot-item">
                    <span className="lot-dot" style={{ background: BRAND.blau }} />
                    <span className="lot-nom">{r.refNom}{r.quantitat ? ` ×${r.quantitat}` : ""}</span>
                    <div className="sol-act"><button className="btn ghost sm" onClick={() => resolReserva(r.id, "rebutjada")}>Rebutja</button><button className="btn prim sm" onClick={() => resolReserva(r.id, "confirmada")}>Aprova</button></div>
                  </div>
                ))}
              </div>
            );
          }
          const r = g.items[0];
          return (
            <div key={r.id} className="sol">
              <div className="sol-info"><FilaReserva r={r} inline /><div className="sol-sub">Sol·licitant: {r.sol} ({r.rol}){(r.professors && r.professors.length) ? ` · ${r.professors.join(", ")}` : r.professor ? ` · ${r.professor}` : ""}{(r.profsRecollida && r.profsRecollida.length) ? ` · recollida: ${r.profsRecollida.join(", ")}` : ""}{r.responsable ? ` · responsable: ${r.responsable.nom} (${r.responsable.email})` : ""}{r.assignatura ? ` · ${r.assignatura}` : ""}{r.persones ? ` · ${r.persones} persones` : ""}</div></div>
              <div className="sol-act"><button className="btn ghost" onClick={() => resolReserva(r.id, "rebutjada")}>Rebutja</button><button className="btn prim" onClick={() => resolReserva(r.id, "confirmada")}>Aprova</button></div>
            </div>
          );
        })}
        {meves.length === 0 && <Buit>No tens sol·licituds pendents de resoldre.</Buit>}
      </div>
      {altres.length > 0 && <><h2 className="h2" style={{ marginTop: 24 }}>Altres pendents (consulta)</h2><div className="list">{altres.map((r) => <FilaReserva key={r.id} r={r} />)}</div></>}
      <Devolucions {...{ enPrestec, potAprovar, registrarRetorn }} />
    </div>
  );
}

function Devolucions({ enPrestec, potAprovar, registrarRetorn }) {
  const meus = enPrestec.filter(potAprovar);
  const grups = []; const perLot = {};
  meus.forEach((r) => {
    if (r.lot) { if (!perLot[r.lot]) { perLot[r.lot] = { lot: r.lot, items: [] }; grups.push(perLot[r.lot]); } perLot[r.lot].items.push(r); }
    else grups.push({ lot: null, items: [r] });
  });
  return (
    <>
      <h2 className="h2" style={{ marginTop: 28 }}>Material en préstec · devolucions</h2>
      <p className="nota">Quan es retorni el material, registra la devolució. Si està trencat o ha desaparegut, cal indicar el motiu i el material queda fora de circulació.</p>
      <div className="list">
        {grups.length === 0 && <Buit>No hi ha material en préstec pendent de retornar.</Buit>}
        {grups.map((g) => {
          const first = g.items[0]; const ids = g.items.map((x) => x.id); const llista = g.items.length > 1;
          return (
            <div key={g.lot || first.id} className="lot prestec">
              <div className="lot-h">
                <div className="lot-t">{llista ? "Llista de " : ""}{first.sol} · {first.data} · {first.ini}–{first.fi}{first.assignatura ? ` · ${first.assignatura}` : ""}
                  {llista ? <span className="lot-n">{g.items.length} ítems</span> : <span className="lot-n">{first.refNom}{first.quantitat ? ` ×${first.quantitat}` : ""}</span>}</div>
                <AccionsRetorn ids={ids} registrarRetorn={registrarRetorn} etiqueta="tot" />
              </div>
              {llista && g.items.map((r) => (
                <div key={r.id} className="lot-item">
                  <span className="lot-dot" style={{ background: "#7a5cc4" }} />
                  <span className="lot-nom">{r.refNom}{r.quantitat ? ` ×${r.quantitat}` : ""}</span>
                  <AccionsRetorn ids={[r.id]} registrarRetorn={registrarRetorn} />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}

function AccionsRetorn({ ids, registrarRetorn, etiqueta }) {
  const [mode, setMode] = useState(null);
  const [motiu, setMotiu] = useState("");
  if (mode) {
    const tit = mode === "trencat" ? "Motiu del desperfecte" : "Què ha passat amb el material";
    return (
      <div className="retmotiu">
        <div className="retmotiu-t">{mode === "trencat" ? "Marcar com a TRENCAT" : "Marcar com a DESAPAREGUT"}{etiqueta ? " · tota la llista" : ""}</div>
        <textarea rows="2" placeholder={tit + "…"} value={motiu} onChange={(e) => setMotiu(e.target.value)} autoFocus />
        <div className="retmotiu-a">
          <button className="btn ghost sm" onClick={() => { setMode(null); setMotiu(""); }}>Cancel·la</button>
          <button className="btn danger sm" disabled={!motiu.trim()} onClick={() => { registrarRetorn(ids, mode, motiu.trim()); setMode(null); setMotiu(""); }}>Confirma</button>
        </div>
        {!motiu.trim() && <p className="nota" style={{ margin: "6px 0 0" }}>Cal indicar el motiu per continuar.</p>}
      </div>
    );
  }
  return (
    <div className="sol-act">
      <button className="btn danger-ghost sm" onClick={() => setMode("perdut")}>Desaparegut</button>
      <button className="btn danger-ghost sm" onClick={() => setMode("trencat")}>Trencat</button>
      <button className="btn ok sm" onClick={() => registrarRetorn(ids, "retornada")}>Retornat{etiqueta ? " correctament" : ""}</button>
    </div>
  );
}

/* ---------------- HISTORIAL + EDICIÓ/ANUL·LACIÓ ---------------- */
function Reparacions({ incidencies, setMaterial, notifica }) {
  const [filtre, setFiltre] = useState("tots");
  const llista = incidencies.filter((m) => filtre === "tots" || (filtre === "rep" ? m.estat === "Reparació" : m.estat === "Perdut"));
  const resoldre = (codi) => {
    setMaterial((ms) => ms.map((m) => (m.codi === codi ? { ...m, estat: "Disponible", incidencia: undefined } : m)));
    notifica("Incidència resolta: el material torna a estar disponible.");
  };
  const canviaEstat = (codi, estat) => setMaterial((ms) => ms.map((m) => (m.codi === codi ? { ...m, estat } : m)));
  const nota = (codi, v) => setMaterial((ms) => ms.map((m) => (m.codi === codi ? { ...m, incidencia: { ...(m.incidencia || {}), nota: v } } : m)));
  const nRep = incidencies.filter((m) => m.estat === "Reparació").length;
  const nPer = incidencies.filter((m) => m.estat === "Perdut").length;
  return (
    <div>
      <div className="rowhead">
        <h2 className="h2">Reparacions i incidències</h2>
        <div className="toolbar">
          {[["tots", `Tots (${incidencies.length})`], ["rep", `En reparació (${nRep})`], ["per", `Desapareguts (${nPer})`]].map(([k, l]) => (
            <button key={k} className={"btn sm " + (filtre === k ? "prim" : "ghost")} onClick={() => setFiltre(k)}>{l}</button>
          ))}
        </div>
      </div>
      <p className="nota">Material fora de circulació. Quan estigui reparat o recuperat, marca'l com a resolt i tornarà a estar disponible per reservar.</p>
      <div className="list">
        {llista.length === 0 && <Buit>No hi ha material en reparació ni desaparegut.</Buit>}
        {llista.map((m) => (
          <div key={m.codi} className={"rep-row" + (m.estat === "Perdut" ? " perdut" : "")}>
            <div className="rep-main">
              <div className="rep-t">{m.nom} <span className="mmeta">· {m.codi} · {m.marca} · {m.ubic}</span></div>
              <div className="rep-sub">
                <Estat estat={m.estat} />
                {m.incidencia && <span className="mmeta"> {m.incidencia.tipus === "perdut" ? "Desaparegut" : "Trencat"} el {m.incidencia.data}{m.incidencia.per ? ` · últim ús: ${m.incidencia.per}` : ""}</span>}
              </div>
              <input className="cell repnota" placeholder="Nota de seguiment (pressupost, enviat a reparar…)" value={(m.incidencia && m.incidencia.nota) || ""} onChange={(e) => nota(m.codi, e.target.value)} />
            </div>
            <div className="sol-act">
              {m.estat === "Perdut"
                ? <button className="btn ghost sm" onClick={() => canviaEstat(m.codi, "Reparació")}>Passa a reparació</button>
                : <button className="btn ghost sm" onClick={() => canviaEstat(m.codi, "Perdut")}>Marca desaparegut</button>}
              <button className="btn ok sm" onClick={() => resoldre(m.codi)}>Resolt · torna a disponible</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Historial({ reserves, onEdit }) {
  const [limit, setLimit] = useState(60);
  const mostra = reserves.slice(0, limit);
  return (
    <div>
      <h2 className="h2">Historial i traçabilitat</h2>
      <p className="nota">Clica una reserva per editar-la o anul·lar-la. {reserves.length} registres.</p>
      <table className="tbl"><thead><tr><th>Tipus</th><th>Referència</th><th>Assignatura</th><th>Sol·licitant</th><th>Data</th><th>Franja</th><th>Estat</th></tr></thead>
        <tbody>{mostra.map((r) => (
          <tr key={r.id} className="trclic" onClick={() => onEdit && onEdit(r)}><td>{r.tipus === "material" ? "Material" : "Espai"}{r.foraHorari ? " · fora" : ""}</td><td>{r.refNom}{r.quantitat ? ` ×${r.quantitat}` : ""}</td><td>{r.assignatura || "—"}</td><td>{r.sol}</td><td>{r.data}</td><td>{r.ini}–{r.fi}</td><td><Estat estat={estatVis(r.estat)} label={r.estat} /></td></tr>
        ))}</tbody></table>
      {reserves.length > limit && <button className="btn ghost" style={{ width: "100%", marginTop: 12 }} onClick={() => setLimit((l) => l + 100)}>Mostra'n més ({reserves.length - limit} restants)</button>}
    </div>
  );
}

function EditReserva({ r, onClose, onSave, onAnular }) {
  const [data, setData] = useState(r.data);
  const [ini, setIni] = useState(r.ini);
  const [fi, setFi] = useState(r.fi);
  const [motiu, setMotiu] = useState(r.motiu || "");
  const [confirma, setConfirma] = useState(false);
  const anul = r.estat === "anul·lada";
  return (
    <Modal onClose={onClose} titol={`Editar reserva · ${r.refNom}`}>
      <p className="modal-sub">{r.tipus === "material" ? "Material" : "Espai"}{r.quantitat ? ` ×${r.quantitat}` : ""} · {r.sol} · <Estat estat={estatVis(r.estat)} label={r.estat} /></p>
      <Camp l="Data"><input type="date" value={data} disabled={anul} onChange={(e) => setData(e.target.value)} /></Camp>
      <div className="camp2"><Camp l="Inici"><input type="time" value={ini} disabled={anul} onChange={(e) => setIni(e.target.value)} /></Camp><Camp l="Fi"><input type="time" value={fi} disabled={anul} onChange={(e) => setFi(e.target.value)} /></Camp></div>
      <Camp l="Motiu"><textarea rows="2" value={motiu} disabled={anul} onChange={(e) => setMotiu(e.target.value)} /></Camp>
      {confirma && <p className="modal-note" style={{ background: "#fdecec" }}>Segur que vols anul·lar aquesta reserva? Alliberarà el recurs i es notificarà el sol·licitant.</p>}
      <div className="modal-act" style={{ justifyContent: "space-between" }}>
        {!anul
          ? (confirma
            ? <button className="btn danger" onClick={onAnular}>Sí, anul·la</button>
            : <button className="btn danger-ghost" onClick={() => setConfirma(true)}>Anul·lar reserva</button>)
          : <span className="nota" style={{ margin: 0 }}>Aquesta reserva està anul·lada.</span>}
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn ghost" onClick={onClose}>Tanca</button>
          {!anul && <button className="btn prim" onClick={() => onSave({ data, ini, fi, motiu })}>Desa canvis</button>}
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- DADES: inventari editable + import/export ---------------- */
function Admin({ material, setMaterial, notifica }) {
  const [nou, setNou] = useState({ codi: "", nom: "", cat: "Vídeo", marca: "", unitats: 1, ubic: "", codiBarres: "" });
  const fileRef = useRef(null);
  const [qrItem, setQrItem] = useState(null);
  const [previsualitza, setPrevisualitza] = useState(null);
  const [cerca, setCerca] = useState("");
  const [limit, setLimit] = useState(50);
  const visibles = useMemo(() => {
    const q = cerca.trim().toLowerCase();
    if (!q) return material;
    return material.filter((m) => m.codi.toLowerCase().includes(q) || (m.nom || "").toLowerCase().includes(q) || (m.marca || "").toLowerCase().includes(q) || (m.ubic || "").toLowerCase().includes(q));
  }, [material, cerca]);
  const cats = ["Vídeo", "Òptiques", "Àudio", "Realització", "Il·luminació", "DJ / Música", "Maletes préstec"];

  const afegir = () => {
    if (!nou.codi || !nou.nom) return notifica("Cal com a mínim CODI i nom.");
    if (material.some((m) => m.codi === nou.codi)) return notifica("Ja existeix aquest CODI.");
    setMaterial((m) => [{ ...nou, unitats: +nou.unitats || 1, estat: "Disponible" }, ...m]);
    setNou({ codi: "", nom: "", cat: "Vídeo", marca: "", unitats: 1, ubic: "", codiBarres: "" }); notifica("Material afegit.");
  };
  const eliminar = (codi) => { setMaterial((m) => m.filter((x) => x.codi !== codi)); notifica("Material eliminat."); };
  const upd = (codi, patch) => setMaterial((m) => m.map((x) => (x.codi === codi ? { ...x, ...patch } : x)));

  const COLS = ["codi", "qr", "nom", "cat", "marca", "unitats", "ubic", "estat", "codiBarres"];
  const exportaCSV = async () => {
    const Papa = await carregaPapa();
    const csv = Papa.unparse(material.map((m) => Object.fromEntries(COLS.map((c) => [c, c === "qr" ? qrDe(m.codi) : (m[c] ?? "")]))));
    baixa("inventari_itaeb.csv", new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  };
  const exportaXLSX = async () => {
    const XLSX = await carregaXLSX();
    const ws = XLSX.utils.json_to_sheet(material.map((m) => Object.fromEntries(COLS.map((c) => [c, c === "qr" ? qrDe(m.codi) : (m[c] ?? "")]))));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Inventari");
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    baixa("inventari_itaeb.xlsx", new Blob([out], { type: "application/octet-stream" }));
  };
  const importa = async (file) => {
    const Papa = await carregaPapa();
    const XLSX = await carregaXLSX();
    const fin = (rows) => {
      const nets = rows.filter((r) => r.codi).map((r) => ({
        codi: String(r.codi).trim(), nom: r.nom || "", cat: r.cat || "Altres", marca: r.marca || "",
        unitats: +r.unitats || 1, ubic: r.ubic || "", estat: r.estat || "", codiBarres: r.codiBarres ? String(r.codiBarres) : "",
      }));
      if (!nets.length) return notifica("No s'han trobat files amb columna 'codi'.");
      const actuals = new Map(material.map((m) => [m.codi, m]));
      const codisNous = new Set(nets.map((n) => n.codi));
      const nous = nets.filter((n) => !actuals.has(n.codi));
      const actualitzats = nets.filter((n) => actuals.has(n.codi));
      const absents = material.filter((m) => !codisNous.has(m.codi));
      setPrevisualitza({ nets, nous: nous.length, actualitzats: actualitzats.length, absents: absents.map((m) => m.codi) });
    };
    if (file.name.toLowerCase().endsWith(".csv")) Papa.parse(file, { header: true, skipEmptyLines: true, complete: (res) => fin(res.data) });
    else {
      const reader = new FileReader();
      reader.onload = (ev) => { const wb = XLSX.read(ev.target.result, { type: "array" }); fin(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])); };
      reader.readAsArrayBuffer(file);
    }
  };

  // Aplica la importació ACTUALITZANT PER CODI: no esborra l'inventari ni perd estats.
  const aplicaImportacio = () => {
    const { nets } = previsualitza;
    const perCodi = new Map(nets.map((n) => [n.codi, n]));
    setMaterial((ms) => {
      const actualitzat = ms.map((m) => {
        const n = perCodi.get(m.codi);
        if (!n) return m;
        return {
          ...m,
          nom: n.nom || m.nom, cat: n.cat || m.cat, marca: n.marca || m.marca,
          unitats: n.unitats || m.unitats, ubic: n.ubic || m.ubic,
          // es conserven estat i incidència tret que el fitxer els indiqui explícitament
          estat: n.estat || m.estat,
          codiBarres: n.codiBarres || m.codiBarres,
        };
      });
      const existents = new Set(ms.map((m) => m.codi));
      const afegits = nets.filter((n) => !existents.has(n.codi)).map((n) => ({ ...n, estat: n.estat || "Disponible", maleta: (n.cat || "").toLowerCase().includes("malet") }));
      return [...afegits, ...actualitzat];
    });
    notifica(`Importació aplicada: ${previsualitza.nous} nous, ${previsualitza.actualitzats} actualitzats.`);
    setPrevisualitza(null);
  };

  return (
    <div>
      <div className="rowhead">
        <h2 className="h2">Inventari (edició)</h2>
        <div className="toolbar">
          <button className="btn ghost sm" onClick={() => fileRef.current && fileRef.current.click()}>Importa CSV/Excel</button>
          <button className="btn ghost sm" onClick={exportaCSV}>Exporta CSV</button>
          <button className="btn ghost sm" onClick={exportaXLSX}>Exporta Excel</button>
          <button className="btn ghost sm" onClick={() => imprimirQRs(material)}>Imprimeix etiquetes QR</button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={(e) => { if (e.target.files[0]) importa(e.target.files[0]); e.target.value = ""; }} />
        </div>
      </div>
      <p className="nota">Edita qualsevol cel·la. En importar, l'inventari <b>s'actualitza per codi</b>: es respecten els estats (prestat, reparació) i el que no aparegui al fitxer no s'esborra. Veuràs un resum abans d'aplicar.</p>
      <div className="addrow">
        <input placeholder="CODI" value={nou.codi} onChange={(e) => setNou({ ...nou, codi: e.target.value })} />
        <input placeholder="Nom" value={nou.nom} onChange={(e) => setNou({ ...nou, nom: e.target.value })} />
        <select value={nou.cat} onChange={(e) => setNou({ ...nou, cat: e.target.value })}>{cats.map((c) => <option key={c}>{c}</option>)}</select>
        <input placeholder="Marca" value={nou.marca} onChange={(e) => setNou({ ...nou, marca: e.target.value })} />
        <input type="number" min="1" style={{ width: 64 }} value={nou.unitats} onChange={(e) => setNou({ ...nou, unitats: e.target.value })} />
        <input placeholder="Ubicació" value={nou.ubic} onChange={(e) => setNou({ ...nou, ubic: e.target.value })} />
        <input placeholder="Codi barres/QR" value={nou.codiBarres} onChange={(e) => setNou({ ...nou, codiBarres: e.target.value })} />
        <button className="btn prim sm" onClick={afegir}>Afegeix</button>
      </div>
      <div className="filtres">
        <input className="cercabox" placeholder="Cerca per nom, codi, marca o ubicació…" value={cerca} onChange={(e) => { setCerca(e.target.value); setLimit(50); }} />
        <span className="nota" style={{ margin: 0, alignSelf: "center" }}>{visibles.length} de {material.length}</span>
      </div>
      <div className="tblwrap">
        <table className="tbl"><thead><tr><th>CODI</th><th>Codi QR</th><th>Nom</th><th>Cat.</th><th>Marca</th><th>Uni.</th><th>Ubicació</th><th>Estat</th><th>Codi barres (opc.)</th><th></th></tr></thead>
          <tbody>{visibles.slice(0, limit).map((m) => (
            <tr key={m.codi}>
              <td className="mono">{m.codi}</td>
              <td className="mono qrcell">{qrDe(m.codi)}<button className="qbtn" title="Veure/imprimir QR" onClick={() => setQrItem(m)}>▣</button></td>
              <td><input className="cell" value={m.nom} onChange={(e) => upd(m.codi, { nom: e.target.value })} /></td>
              <td><select className="cell" value={m.cat} onChange={(e) => upd(m.codi, { cat: e.target.value })}>{[...new Set([...cats, m.cat])].map((c) => <option key={c}>{c}</option>)}</select></td>
              <td><input className="cell" value={m.marca} onChange={(e) => upd(m.codi, { marca: e.target.value })} /></td>
              <td><input className="cell" type="number" min="0" style={{ width: 52 }} value={m.unitats} onChange={(e) => upd(m.codi, { unitats: +e.target.value })} /></td>
              <td><input className="cell" value={m.ubic} onChange={(e) => upd(m.codi, { ubic: e.target.value })} /></td>
              <td><select className="cell" value={m.estat} onChange={(e) => upd(m.codi, { estat: e.target.value })}>{["Disponible", "Prestat", "Reparació", "Perdut"].map((s) => <option key={s}>{s}</option>)}</select></td>
              <td><input className="cell" placeholder="—" value={m.codiBarres || ""} onChange={(e) => upd(m.codi, { codiBarres: e.target.value })} /></td>
              <td><button className="x" onClick={() => eliminar(m.codi)}>✕</button></td>
            </tr>
          ))}</tbody></table>
      </div>
      {visibles.length > limit && (
        <button className="btn ghost" style={{ width: "100%", marginTop: 12 }} onClick={() => setLimit((l) => l + 100)}>
          Mostra'n més ({visibles.length - limit} restants)
        </button>
      )}
      {qrItem && <ModalQR m={qrItem} onClose={() => setQrItem(null)} />}
      {previsualitza && (
        <Modal titol="Confirmar importació" onClose={() => setPrevisualitza(null)}>
          <p className="modal-sub">Resum abans d'aplicar els canvis</p>
          <div className="list">
            <div className="fila"><span className="fila-dot" style={{ background: BRAND.blau }} /><div className="fila-main"><div className="fila-nom">{previsualitza.nous} referències noves</div><div className="fila-meta">S'afegiran a l'inventari</div></div></div>
            <div className="fila"><span className="fila-dot" style={{ background: BRAND.groc }} /><div className="fila-main"><div className="fila-nom">{previsualitza.actualitzats} actualitzades</div><div className="fila-meta">Nom, marca, unitats i ubicació. Es conserva l'estat (prestat, reparació…) i el codi de barres</div></div></div>
            <div className="fila"><span className="fila-dot" style={{ background: "#9aa0a6" }} /><div className="fila-main"><div className="fila-nom">{previsualitza.absents.length} no apareixen al fitxer</div><div className="fila-meta">{previsualitza.absents.length ? "NO s'esborraran; revisa-les manualment si cal donar-les de baixa" : "Cap"}</div></div></div>
          </div>
          {previsualitza.absents.length > 0 && <p className="modal-note">Codis absents: <span className="mono">{previsualitza.absents.slice(0, 12).join(", ")}{previsualitza.absents.length > 12 ? "…" : ""}</span></p>}
          <div className="modal-act"><button className="btn ghost" onClick={() => setPrevisualitza(null)}>Cancel·la</button><button className="btn prim" onClick={aplicaImportacio}>Aplica la importació</button></div>
        </Modal>
      )}
    </div>
  );
}

function ModalQR({ m, onClose }) {
  const val = qrDe(m.codi);
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(val)}`;
  return (
    <Modal titol={`Codi QR · ${m.codi}`} onClose={onClose}>
      <p className="modal-sub">{m.nom}</p>
      <div style={{ textAlign: "center" }}>
        <img src={src} alt={`QR ${val}`} width="220" height="220" style={{ border: "1px solid #eee", borderRadius: 10, padding: 8 }} />
        <p className="mono" style={{ fontSize: 12, marginTop: 8 }}>{val}</p>
      </div>
      <p className="modal-note">Enganxa aquesta etiqueta al material. En escanejar-la des de "Reserva per escaneig", l'aplicació hi reconeixerà el codi <b>{m.codi}</b>.</p>
      <div className="modal-act"><button className="btn ghost" onClick={onClose}>Tanca</button><button className="btn prim" onClick={() => imprimirQRs([m])}>Imprimeix</button></div>
    </Modal>
  );
}

function imprimirQRs(items) {
  const cel = items.map((m) => {
    const val = qrDe(m.codi);
    const src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(val)}`;
    return `<div class="et"><img src="${src}"><div class="c">${m.codi}</div><div class="n">${(m.nom || "").slice(0, 34)}</div></div>`;
  }).join("");
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<html><head><title>Etiquetes QR · ITAEB</title><style>
    body{font-family:Arial,sans-serif;margin:14px;display:flex;flex-wrap:wrap;gap:10px}
    .et{width:150px;border:1px solid #ddd;border-radius:8px;padding:8px;text-align:center;page-break-inside:avoid}
    .et img{width:120px;height:120px}
    .c{font-family:monospace;font-size:11px;font-weight:bold;margin-top:4px}
    .n{font-size:9px;color:#555;line-height:1.2}
  </style></head><body>${cel}</body></html>`);
  w.document.close();
}

/* ---------------- PROFESSORAT I ASSIGNATURES ---------------- */
function Persones({ profes, setProfes, alumnes, setAlumnes, assignatures, setAssignatures, espais, setEspais, notifica, rol }) {
  return (
    <div>
      <h2 className="h2">Edició pestanyes</h2>
      <p className="nota">Edita el professorat i les assignatures dels desplegables de reserva, i els espais que apareixen a "Reserva d'espais".</p>
      <div className="two-col">
        <EditProfes profes={profes} setProfes={setProfes} notifica={notifica} rol={rol} />
        <EditList titol="Assignatures" items={assignatures} setItems={setAssignatures} placeholder="Nom de l'assignatura…" notifica={notifica} />
      </div>
      {rol === "Administrador" && <div style={{ marginTop: 22 }}><GestioAlumnat alumnes={alumnes} setAlumnes={setAlumnes} notifica={notifica} /></div>}
      <div style={{ marginTop: 22 }}><EditEspais espais={espais} setEspais={setEspais} notifica={notifica} /></div>
    </div>
  );
}

function GestioAlumnat({ alumnes, setAlumnes, notifica }) {
  const fileRef = useRef(null);
  const COLS = ["nom", "email", "grup"];
  const exportaCSV = async () => {
    const Papa = await carregaPapa();
    const csv = Papa.unparse(alumnes.map((a) => Object.fromEntries(COLS.map((c) => [c, a[c] ?? ""]))));
    baixa("alumnat_itaeb.csv", new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  };
  const exportaXLSX = async () => {
    const XLSX = await carregaXLSX();
    const ws = XLSX.utils.json_to_sheet(alumnes.map((a) => Object.fromEntries(COLS.map((c) => [c, a[c] ?? ""]))));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Alumnat");
    baixa("alumnat_itaeb.xlsx", new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/octet-stream" }));
  };
  const importa = async (file) => {
    const Papa = await carregaPapa();
    const XLSX = await carregaXLSX();
    const fin = (rows) => {
      const nets = rows.map((r) => ({ nom: (r.nom || r.Nom || "").trim(), email: (r.email || r.Email || r.correu || "").trim(), grup: (r.grup || r.Grup || "").trim() }))
        .filter((a) => a.nom && a.email);
      if (!nets.length) return notifica("No s'han trobat files amb columnes 'nom' i 'email'.");
      setAlumnes(nets); notifica(`Alumnat importat: ${nets.length} registres.`);
    };
    if (file.name.toLowerCase().endsWith(".csv")) Papa.parse(file, { header: true, skipEmptyLines: true, complete: (res) => fin(res.data) });
    else { const rd = new FileReader(); rd.onload = (ev) => { const wb = XLSX.read(ev.target.result, { type: "array" }); fin(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])); }; rd.readAsArrayBuffer(file); }
  };
  return (
    <div className="editlist">
      <div className="rowhead">
        <div className="cat-t" style={{ border: 0, margin: 0 }}>Alumnat ({alumnes.length})</div>
        <div className="toolbar">
          <button className="btn ghost sm" onClick={() => fileRef.current && fileRef.current.click()}>Importa CSV/Excel</button>
          <button className="btn ghost sm" onClick={exportaCSV}>Exporta CSV</button>
          <button className="btn ghost sm" onClick={exportaXLSX}>Exporta Excel</button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={(e) => { if (e.target.files[0]) importa(e.target.files[0]); e.target.value = ""; }} />
        </div>
      </div>
      <p className="nota">Només administració. La llista alimenta el camp "Alumne/a responsable" de les reserves. El fitxer ha de tenir les columnes <b>nom</b>, <b>email</b> i (opcional) <b>grup</b>. Importar substitueix la llista sencera.</p>
      <div className="mlist" style={{ maxHeight: "40vh", overflow: "auto" }}>
        {alumnes.length === 0 && <div className="buit" style={{ border: 0 }}>Cap alumne carregat. Importa un CSV o Excel.</div>}
        {alumnes.map((a, i) => (
          <div key={i} className="elrow">
            <span className="mnom" style={{ flex: 1 }}>{a.nom}<span className="mmeta"> · {a.email}{a.grup ? ` · ${a.grup}` : ""}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditEspais({ espais, setEspais, notifica }) {
  const [nou, setNou] = useState({ nom: "", equipament: "", foraHorari: false });
  const afegir = () => {
    const nom = nou.nom.trim(); if (!nom) return notifica("Cal un nom d'espai.");
    if (espais.some((e) => e.nom === nom)) return notifica("Ja existeix aquest espai.");
    if (nou.foraHorari && !PROTOCOLS[nom]) notifica("Espai afegit. Recorda definir-ne les franges de protocol.");
    setEspais([...espais, { nom, equipament: nou.equipament.trim(), foraHorari: nou.foraHorari }]);
    setNou({ nom: "", equipament: "", foraHorari: false });
  };
  const upd = (i, patch) => setEspais(espais.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const treu = (i) => { setEspais(espais.filter((_, j) => j !== i)); notifica("Espai eliminat."); };
  return (
    <div className="editlist">
      <div className="cat-t">Espais ({espais.length})</div>
      <p className="nota">Els canvis es reflecteixen directament a la llista de "Reserva d'espais". Marca "Fora d'horari" només per a les aules amb protocol de reserva d'alumnat.</p>
      <div className="addrow" style={{ marginBottom: 10 }}>
        <input placeholder="Nom de l'espai…" value={nou.nom} onChange={(e) => setNou({ ...nou, nom: e.target.value })} style={{ flex: 1, minWidth: 160 }} />
        <input placeholder="Equipament…" value={nou.equipament} onChange={(e) => setNou({ ...nou, equipament: e.target.value })} style={{ flex: 1.4, minWidth: 180 }} />
        <label className="check" style={{ margin: 0 }}><input type="checkbox" checked={nou.foraHorari} onChange={(e) => setNou({ ...nou, foraHorari: e.target.checked })} /> Fora d'horari</label>
        <button className="btn prim sm" onClick={afegir}>Afegeix</button>
      </div>
      <div className="mlist">
        {espais.map((e, i) => (
          <div key={i} className="erow">
            <input className="cell" value={e.nom} onChange={(ev) => upd(i, { nom: ev.target.value })} />
            <input className="cell eq" value={e.equipament} onChange={(ev) => upd(i, { equipament: ev.target.value })} />
            <label className="check mini" title="Reservable fora d'horari"><input type="checkbox" checked={!!e.foraHorari} onChange={(ev) => upd(i, { foraHorari: ev.target.checked })} /> Fora h.</label>
            <button className="x" onClick={() => treu(i)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditProfes({ profes, setProfes, notifica, rol }) {
  const [nou, setNou] = useState("");
  const admin = rol === "Administrador";
  const afegir = () => {
    const v = nou.trim(); if (!v) return;
    if (profes.some((p) => p.nom === v)) return notifica("Ja existeix a la llista.");
    setProfes([...profes, { nom: v, email: correuDe(v) }]); setNou("");
  };
  const canviaNom = (i, v) => setProfes(profes.map((p, j) => (j === i ? { ...p, nom: v, email: p.emailManual ? p.email : correuDe(v) } : p)));
  const canviaEmail = (i, v) => setProfes(profes.map((p, j) => (j === i ? { ...p, email: v, emailManual: true } : p)));
  const regenera = (i) => setProfes(profes.map((p, j) => (j === i ? { ...p, email: correuDe(p.nom), emailManual: false } : p)));
  const treu = (i) => setProfes(profes.filter((_, j) => j !== i));
  return (
    <div className="editlist">
      <div className="cat-t">Professorat ({profes.length})</div>
      <p className="nota">El correu es genera automàticament a partir del nom (inicial + cognom @itaeb.cat){admin ? " i el pots editar" : ""}. En connectar la base de dades, aquest correu serà el d'accés amb el compte del centre.</p>
      <div className="addrow" style={{ marginBottom: 10 }}>
        <input placeholder="Nom i cognom…" value={nou} onChange={(e) => setNou(e.target.value)} onKeyDown={(e) => e.key === "Enter" && afegir()} style={{ flex: 1 }} />
        <button className="btn prim sm" onClick={afegir}>Afegeix</button>
      </div>
      {nou.trim() && <p className="nota" style={{ marginTop: -4 }}>Correu previst: <b>{correuDe(nou)}</b></p>}
      <div className="mlist">
        {profes.map((p, i) => (
          <div key={i} className="prow">
            <input className="cell" value={p.nom} onChange={(e) => canviaNom(i, e.target.value)} />
            <input className="cell mail" value={p.email} disabled={!admin} onChange={(e) => canviaEmail(i, e.target.value)} />
            {admin && p.emailManual && <button className="qbtn" title="Torna al correu automàtic" onClick={() => regenera(i)}>↺</button>}
            <button className="x" onClick={() => treu(i)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditList({ titol, items, setItems, placeholder, notifica }) {
  const [nou, setNou] = useState("");
  const afegir = () => {
    const v = nou.trim(); if (!v) return;
    if (items.includes(v)) return notifica("Ja existeix a la llista.");
    setItems([...items, v]); setNou("");
  };
  const canvia = (i, v) => setItems(items.map((x, j) => (j === i ? v : x)));
  const treu = (i) => setItems(items.filter((_, j) => j !== i));
  return (
    <div className="editlist">
      <div className="cat-t">{titol} ({items.length})</div>
      <div className="addrow" style={{ marginBottom: 10 }}>
        <input placeholder={placeholder} value={nou} onChange={(e) => setNou(e.target.value)} onKeyDown={(e) => e.key === "Enter" && afegir()} style={{ flex: 1 }} />
        <button className="btn prim sm" onClick={afegir}>Afegeix</button>
      </div>
      <div className="mlist">
        {items.map((it, i) => (
          <div key={i} className="elrow">
            <input className="cell" value={it} onChange={(e) => canvia(i, e.target.value)} />
            <button className="x" onClick={() => treu(i)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Peces ---------- */
const ESTAT_LBL = { confirmada: "Confirmada", pendent: "Pendent", prestec: "En préstec", retornada: "Retornada", trencat: "Trencat", perdut: "Desaparegut", "anul·lada": "Anul·lada", rebutjada: "Rebutjada" };
const estatVis = (e) => ESTAT_LBL[e] || "Rebutjada";
function FilaReserva({ r, inline }) {
  return (
    <div className={"fila" + (inline ? " inline" : "")}>
      <span className="fila-dot" style={{ background: r.tipus === "material" ? BRAND.blau : BRAND.groc }} />
      <div className="fila-main"><div className="fila-nom">{r.refNom}{r.quantitat ? ` ×${r.quantitat}` : ""}</div><div className="fila-meta">{r.sol} · {r.data} · {r.ini}–{r.fi}{r.assignatura ? ` · ${r.assignatura}` : ""}{r.motiu ? ` · ${r.motiu}` : ""}</div></div>
      {!inline && <Estat estat={estatVis(r.estat)} label={r.estat} />}
    </div>
  );
}
function Estat({ estat, label }) {
  const map = { Disponible: BRAND.blau, Confirmada: BRAND.blau, Retornada: "#1f9d55", "En préstec": "#7a5cc4", Prestat: BRAND.vermell, Trencat: BRAND.vermell, Desaparegut: BRAND.vermell, "Reparació": BRAND.negre, Perdut: "#8a6d3b", Pendent: BRAND.groc, Rebutjada: BRAND.vermell, "Anul·lada": "#9aa0a6" };
  return <span className="estat" style={{ color: map[estat] || BRAND.negre, borderColor: map[estat] || BRAND.negre }}>{label || estat}</span>;
}
function AlumnePicker({ alumnes, sel, setSel, label }) {
  const [q, setQ] = useState("");
  const [obert, setObert] = useState(false);
  const cerca = q.trim().toLowerCase();
  const sugg = alumnes.filter((a) => !cerca || a.nom.toLowerCase().includes(cerca) || a.email.toLowerCase().includes(cerca)).slice(0, 8);
  if (sel) {
    return (
      <div className="camp profpick">
        <span>{label}</span>
        <div className="chips"><span className="pchip alum">{sel.nom} <em>{sel.email}</em><button onClick={() => setSel(null)} aria-label="Treu">✕</button></span></div>
      </div>
    );
  }
  return (
    <div className="camp profpick">
      <span>{label}</span>
      <div className="pwrap">
        <input value={q} placeholder="Cerca per nom o correu…" onChange={(e) => { setQ(e.target.value); setObert(true); }}
          onFocus={() => setObert(true)} onBlur={() => setTimeout(() => setObert(false), 150)}
          onKeyDown={(e) => { if (e.key === "Enter" && sugg.length) { e.preventDefault(); setSel(sugg[0]); setQ(""); setObert(false); } }} />
        {obert && sugg.length > 0 && (
          <div className="psugg">
            {sugg.map((a) => <button key={a.email} onMouseDown={(e) => e.preventDefault()} onClick={() => { setSel(a); setQ(""); setObert(false); }}>{a.nom} <em className="sugmail">{a.email}{a.grup ? ` · ${a.grup}` : ""}</em></button>)}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfPicker({ profes, sel, setSel, max = 3, label }) {
  const [q, setQ] = useState("");
  const [obert, setObert] = useState(false);
  const noms = nomsDe(profes);
  const cerca = q.trim().toLowerCase();
  const sugg = noms.filter((n) => !sel.includes(n) && (!cerca || n.toLowerCase().includes(cerca))).slice(0, 8);
  const ple = sel.length >= max;
  const afegeix = (n) => { if (!ple && !sel.includes(n)) setSel([...sel, n]); setQ(""); setObert(false); };
  return (
    <div className="camp profpick">
      <span>{label} <span className="pmax">{sel.length}/{max}</span></span>
      {sel.length > 0 && (
        <div className="chips">
          {sel.map((n) => (
            <span key={n} className="pchip">{n}<button onClick={() => setSel(sel.filter((x) => x !== n))} aria-label="Treu">✕</button></span>
          ))}
        </div>
      )}
      {!ple && (
        <div className="pwrap">
          <input value={q} placeholder="Escriu per cercar professorat…" onChange={(e) => { setQ(e.target.value); setObert(true); }}
            onFocus={() => setObert(true)} onBlur={() => setTimeout(() => setObert(false), 150)}
            onKeyDown={(e) => { if (e.key === "Enter" && sugg.length) { e.preventDefault(); afegeix(sugg[0]); } }} />
          {obert && sugg.length > 0 && (
            <div className="psugg">
              {sugg.map((n) => <button key={n} onMouseDown={(e) => e.preventDefault()} onClick={() => afegeix(n)}>{n}</button>)}
            </div>
          )}
        </div>
      )}
      {ple && <p className="nota" style={{ margin: "4px 0 0" }}>Màxim {max} professors.</p>}
    </div>
  );
}

function Camp({ l, children }) { return <label className="camp"><span>{l}</span>{children}</label>; }
function Buit({ children }) { return <div className="buit">{children}</div>; }
function Modal({ titol, children, onClose }) {
  return <div className="overlay" onClick={onClose}><div className="modal" onClick={(e) => e.stopPropagation()}><div className="modal-h"><h3>{titol}</h3><button className="x" onClick={onClose}>✕</button></div>{children}</div></div>;
}
function baixa(nom, blob) { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = nom; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500); }
function LogoITAEB({ size = 120, ambText = true }) {
  // Reconstrucció vectorial fidel del logo del centre.
  const vb = ambText ? "128 60 440 710" : "138 68 420 420";
  return (
    <svg width={size} height={size * (ambText ? 700 / 420 : 1)} viewBox={vb} xmlns="http://www.w3.org/2000/svg"
      role="img" aria-label="Institut de Tècniques Audiovisuals i de l'Espectacle de Barcelona">
      <g fill="none" strokeWidth="14" strokeLinecap="square">
        <path d="M149 162 L266 205 L267 474 L148 361 Z" stroke={BRAND.blau} />
        <path d="M153 161 L376 78 L377 362 L157 360" stroke={BRAND.vermell} />
        <path d="M267 205 L545 250 L546 418 L268 475" stroke={BRAND.groc} />
        <path d="M378 358 L538 414" stroke={BRAND.negre} />
      </g>
      {ambText && (
        <g fill={BRAND.negre} textAnchor="middle" fontFamily="'Segoe UI', system-ui, sans-serif">
          <text x="347" y="560" fontSize="52">Institut de Tècniques</text>
          <text x="347" y="618" fontSize="52">Audiovisuals</text>
          <text x="347" y="676" fontSize="52">i de l'Espectacle</text>
          <text x="347" y="730" fontSize="44" fill="#555">de Barcelona</text>
        </g>
      )}
    </svg>
  );
}

function Cub() {
  return <svg width="34" height="34" viewBox="0 0 100 100" aria-hidden>
    <path d="M20 78 L20 32 L50 20 L50 66 Z" fill="none" stroke={BRAND.blau} strokeWidth="4" />
    <path d="M50 20 L80 32 L80 78 L50 66" fill="none" stroke={BRAND.groc} strokeWidth="4" />
    <path d="M20 32 L44 26 L74 38" fill="none" stroke={BRAND.vermell} strokeWidth="4" />
    <path d="M50 66 L80 78" fill="none" stroke={BRAND.negre} strokeWidth="4" />
  </svg>;
}

const css = `
* { box-sizing: border-box; }
.app { font-family:'Segoe UI', system-ui, -apple-system, sans-serif; color:${BRAND.negre}; background:#fff; min-height:100vh; }
.top { display:flex; justify-content:space-between; align-items:center; padding:14px 22px; border-bottom:1px solid #ececec; position:sticky; top:0; background:#fff; z-index:6; }
.brand { display:flex; align-items:center; gap:12px; }
.brand-t { font-weight:800; font-size:18px; letter-spacing:-.3px; }
.brand-s { font-size:12px; color:#8a8a8a; }
.whoami { display:flex; align-items:center; gap:10px; }
.who-name { font-size:13px; color:#555; }
.whoami select, .addrow select { padding:7px 10px; border:1px solid #ddd; border-radius:8px; font-size:13px; background:#fff; }
.tabs { display:flex; gap:4px; padding:0 16px; border-bottom:1px solid #ececec; overflow-x:auto; position:sticky; top:59px; background:#fff; z-index:5; }
.tab { border:0; background:none; padding:13px 14px; font-size:13.5px; color:#666; cursor:pointer; border-bottom:3px solid transparent; white-space:nowrap; }
.tab.on { color:${BRAND.negre}; font-weight:700; border-bottom-color:${BRAND.vermell}; }
.main { max-width:1060px; margin:0 auto; padding:22px; }
.hero { padding:20px 24px; border-left:5px solid ${BRAND.blau}; background:#fafafa; border-radius:0 12px 12px 0; margin-bottom:16px; }
.hero.small { padding:16px 20px; }
.hero h1 { margin:0 0 4px; font-size:22px; letter-spacing:-.5px; }
.hero p { margin:0; color:#666; font-size:14px; }
.h2 { font-size:15px; margin:6px 0 12px; font-weight:700; }
.nota { font-size:12.5px; color:#888; margin:0 0 12px; }
.nota.err { color:${BRAND.vermell}; }
.legend { display:flex; gap:16px; margin:0 0 10px; font-size:12px; color:#666; flex-wrap:wrap; }
.legend span { display:flex; align-items:center; gap:6px; }
.legend i { width:11px; height:11px; border-radius:3px; display:inline-block; }
.rowhead { display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; }
.toolbar { display:flex; gap:8px; flex-wrap:wrap; }
.gridwrap { overflow-x:auto; border:1px solid #eee; border-radius:10px; }
.dualcal { display:grid; grid-template-columns:1fr 1fr; gap:16px; align-items:start; }
.calcol { min-width:0; }
.gridwrap.compact .week { min-width:0; width:100%; font-size:10.5px; }
.gridwrap.compact .week th:not(.hcol) { width:auto; padding:5px 3px; }
.gridwrap.compact .week th.hcol, .gridwrap.compact .week td.hcol { width:52px; font-size:9.5px; }
.gridwrap.compact .week td.hcol .fdash { display:none; }
.gridwrap.compact .week td { height:26px; padding:2px; }
.gridwrap.compact .chip { font-size:9px; padding:1px 3px; margin-bottom:2px; border-left-width:2px; }
.gridwrap.compact .week th .thd { font-size:9px; }
.gridwrap.compact .week th .thf { font-size:8.5px; }
.gridwrap.compact .lliure { display:none; }
.week { border-collapse:collapse; table-layout:fixed; font-size:12px; }
.week th { background:#fafafa; padding:8px 6px; border-bottom:2px solid #eee; font-size:11px; color:#777; text-align:center; }
.week th:not(.hcol) { width:150px; }
.week th.hcol, .week td.hcol { width:78px; text-align:left; white-space:nowrap; color:#999; font-variant-numeric:tabular-nums; }
.week td { border-bottom:1px solid #f2f2f2; border-left:1px solid #f4f4f4; padding:4px; vertical-align:top; height:34px; }
.week td.hcol .fdash { color:#c7c7c7; }
.week tr.pati td, .week tr.migdia td { background:#fbfbfb; }
.week td.brk { color:#c0c0c0; text-align:center; font-size:10.5px; }
.week td.reservable { background:#fffdf3; }
.week td.clik { cursor:pointer; }
.week td.clik:hover { box-shadow:inset 0 0 0 2px ${BRAND.blau}55; background:#eef7fd; }
.chip { display:block; border:1px solid; border-left-width:3px; border-radius:5px; padding:2px 5px; margin-bottom:3px; font-size:10.5px; line-height:1.25; background:#fff; }
.lliure { font-size:10px; color:#cfcfcf; }
.week td.reservable .lliure { color:#c9a63a; }
.catblock { margin-top:18px; }
.cat-t { font-size:12px; font-weight:700; color:#999; margin-bottom:8px; padding-bottom:4px; border-bottom:1px solid #f0f0f0; }
.grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(215px,1fr)); gap:12px; }
.card { text-align:left; border:1px solid #e8e8e8; border-radius:11px; padding:13px; background:#fff; cursor:pointer; transition:border-color .12s, box-shadow .12s; }
.card:hover { border-color:${BRAND.blau}; box-shadow:0 2px 10px rgba(0,0,0,.05); }
.card-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:7px; }
.codi { font-family:ui-monospace, monospace; font-size:11px; color:#999; letter-spacing:.5px; }
.card-nom { font-weight:700; font-size:14px; line-height:1.25; }
.card-meta { font-size:11.5px; color:#888; margin-top:4px; }
.stock { font-size:12px; color:#555; margin-top:8px; }
.badge { color:#fff; font-size:10px; font-weight:700; padding:2px 7px; border-radius:20px; }
.estat { font-size:10.5px; font-weight:700; padding:2px 8px; border:1px solid; border-radius:20px; text-transform:capitalize; white-space:nowrap; }
.mlist { border:1px solid #eee; border-radius:11px; overflow:hidden; }
.mrow { width:100%; display:flex; align-items:center; gap:12px; padding:10px 14px; border:0; border-bottom:1px solid #f4f4f4; background:#fff; cursor:pointer; text-align:left; }
.mrow:last-child { border-bottom:0; }
.mrow:hover { background:#f6fbfe; }
.mrow.rep { opacity:.5; cursor:not-allowed; }
.mcodi { font-family:ui-monospace,monospace; font-size:11px; color:#999; width:118px; flex:none; }
.mnom { flex:1; font-weight:600; font-size:13.5px; min-width:0; }
.mmeta { font-weight:400; color:#999; font-size:12px; }
.mstock { font-size:12px; color:#777; width:52px; text-align:right; flex:none; }
.espais-layout { display:flex; gap:18px; align-items:flex-start; }
.espais-side { width:224px; flex:none; border:1px solid #eee; border-radius:11px; overflow:auto; position:sticky; top:112px; max-height:calc(100vh - 130px); }
.espai-row { width:100%; display:flex; justify-content:space-between; align-items:center; gap:8px; padding:11px 13px; border:0; border-bottom:1px solid #f4f4f4; background:#fff; cursor:pointer; text-align:left; }
.espai-row:last-child { border-bottom:0; }
.espai-row:hover { background:#fafafa; }
.espai-row.on { background:${BRAND.blau}12; box-shadow:inset 3px 0 0 ${BRAND.blau}; }
.espai-nom { font-weight:600; font-size:13px; }
.espais-detail { flex:1; min-width:0; }
.list { display:flex; flex-direction:column; gap:8px; }
.fila { display:flex; align-items:center; gap:12px; border:1px solid #eee; border-radius:10px; padding:11px 14px; }
.fila.inline { border:0; padding:0; }
.fila-dot { width:9px; height:9px; border-radius:50%; flex:none; }
.fila-main { flex:1; }
.fila-nom { font-weight:600; font-size:14px; }
.fila-meta { font-size:12px; color:#888; margin-top:2px; }
.sol { display:flex; align-items:center; gap:16px; border:1px solid #eee; border-left:4px solid ${BRAND.groc}; border-radius:10px; padding:12px 14px; }
.sol-info { flex:1; } .sol-sub { font-size:12px; color:#888; margin-top:5px; } .sol-act { display:flex; gap:8px; }
.lot { border:1px solid #eee; border-left:4px solid ${BRAND.groc}; border-radius:10px; overflow:hidden; }
.lot.prestec { border-left-color:#7a5cc4; }
.btn.ok { background:#1f9d55; color:#fff; }
.profpick .pmax { color:#aaa; font-weight:400; }
.chips { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:6px; }
.pchip { display:inline-flex; align-items:center; gap:6px; background:${BRAND.blau}14; color:${BRAND.negre}; border:1px solid ${BRAND.blau}55; border-radius:20px; padding:3px 8px; font-size:12px; }
.pchip button { border:0; background:none; color:#888; cursor:pointer; font-size:11px; padding:0; }
.pwrap { position:relative; }
.psugg { position:absolute; z-index:30; left:0; right:0; top:100%; margin-top:4px; background:#fff; border:1px solid #e2e2e2; border-radius:9px; box-shadow:0 8px 24px rgba(0,0,0,.12); max-height:190px; overflow:auto; }
.psugg button { display:block; width:100%; text-align:left; border:0; background:none; padding:8px 11px; font-size:13px; cursor:pointer; }
.psugg button:hover { background:#f4faff; }
.sugmail { color:#999; font-style:normal; font-size:11.5px; }
.pchip.alum em { font-style:normal; color:#888; font-size:11px; margin-left:2px; }
.rep-row { display:flex; align-items:center; gap:16px; border:1px solid #eee; border-left:4px solid ${BRAND.negre}; border-radius:10px; padding:12px 14px; flex-wrap:wrap; }
.rep-row.perdut { border-left-color:#8a6d3b; }
.rep-main { flex:1; min-width:220px; }
.rep-t { font-weight:600; font-size:13.5px; }
.rep-sub { display:flex; align-items:center; gap:8px; margin:6px 0 8px; font-size:12px; }
.repnota { width:100%; padding:6px 8px; border:1px solid #e6e6e6; border-radius:6px; font-size:12.5px; }
.retmotiu { border:1px solid ${BRAND.vermell}44; background:#fdf6f6; border-radius:10px; padding:10px 12px; min-width:280px; flex:1; }
.retmotiu-t { font-size:12px; font-weight:700; color:${BRAND.vermell}; margin-bottom:6px; }
.retmotiu textarea { width:100%; padding:8px 9px; border:1px solid #e2d2d2; border-radius:7px; font-size:12.5px; font-family:inherit; resize:vertical; }
.retmotiu-a { display:flex; justify-content:flex-end; gap:8px; margin-top:8px; }
.btn.danger.sm:disabled { background:#e6c9c9; cursor:not-allowed; }
.lot-h { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:11px 14px; background:#fbfbfb; border-bottom:1px solid #f0f0f0; flex-wrap:wrap; }
.lot-t { font-size:13px; font-weight:600; }
.lot-n { color:#999; font-weight:400; font-size:12px; margin-left:8px; }
.lot-item { display:flex; align-items:center; gap:10px; padding:9px 14px; border-bottom:1px solid #f5f5f5; }
.lot-item:last-child { border-bottom:0; }
.lot-dot { width:8px; height:8px; border-radius:50%; flex:none; }
.lot-nom { flex:1; font-size:13px; font-weight:600; }
.buit { padding:22px; text-align:center; color:#999; border:1px dashed #ddd; border-radius:10px; font-size:13px; }
.tblwrap { overflow-x:auto; }
.tbl { width:100%; border-collapse:collapse; font-size:13px; }
.tbl th { text-align:left; padding:9px 10px; border-bottom:2px solid #eee; color:#999; font-size:11px; font-weight:700; white-space:nowrap; }
.tbl td { padding:6px 8px; border-bottom:1px solid #f2f2f2; }
.tbl select.cell, .tbl input.cell { padding:5px 7px; border:1px solid #e3e3e3; border-radius:6px; font-size:12.5px; width:100%; min-width:80px; }
.trclic { cursor:pointer; } .trclic:hover { background:#f6fbfe; }
.mono { font-family:ui-monospace, monospace; font-size:12px; }
.qrcell { white-space:nowrap; color:#666; font-size:11px; }
.qrcell .qbtn { margin-left:6px; }
.addrow { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px; align-items:center; }
.addrow input { padding:8px 10px; border:1px solid #ddd; border-radius:8px; font-size:13px; }
.x { border:0; background:none; color:#c00; cursor:pointer; font-size:14px; }
.two-col { display:grid; grid-template-columns:1fr 1fr; gap:22px; }
.editlist .mlist { max-height:60vh; overflow:auto; }
.elrow { display:flex; align-items:center; gap:8px; padding:6px 10px; border-bottom:1px solid #f4f4f4; }
.elrow:last-child { border-bottom:0; }
.elrow .cell { flex:1; padding:6px 8px; border:1px solid #e6e6e6; border-radius:6px; font-size:13px; }
.prow { display:flex; align-items:center; gap:6px; padding:6px 10px; border-bottom:1px solid #f4f4f4; }
.prow:last-child { border-bottom:0; }
.prow .cell { flex:1; padding:6px 8px; border:1px solid #e6e6e6; border-radius:6px; font-size:12.5px; min-width:0; }
.prow .cell.mail { flex:1.2; font-family:ui-monospace,monospace; font-size:11.5px; color:#555; }
.prow .cell:disabled { background:#f7f7f7; color:#888; }
.erow { display:flex; align-items:center; gap:8px; padding:6px 10px; border-bottom:1px solid #f4f4f4; }
.erow:last-child { border-bottom:0; }
.erow .cell { flex:1; padding:6px 8px; border:1px solid #e6e6e6; border-radius:6px; font-size:12.5px; min-width:0; }
.erow .cell.eq { flex:1.6; color:#666; }
.check.mini { font-size:11.5px; color:#888; gap:5px; white-space:nowrap; margin:0; }
.cartcols { display:grid; grid-template-columns:1fr 330px; gap:22px; align-items:start; }
.cart { border:1px solid #eee; border-radius:12px; padding:14px; position:sticky; top:112px; max-height:calc(100vh - 130px); overflow-y:auto; overscroll-behavior:contain; }
.cart::-webkit-scrollbar { width:8px; }
.cart::-webkit-scrollbar-thumb { background:#dcdcdc; border-radius:8px; }
.cart-h { position:sticky; top:0; background:#fff; padding-bottom:8px; z-index:2; }
.cart-h { font-weight:800; font-size:14px; margin-bottom:10px; }
.filtres { display:flex; gap:8px; margin:10px 0 4px; flex-wrap:wrap; }
.cercabox { flex:1; min-width:180px; padding:9px 11px; border:1px solid #ddd; border-radius:9px; font-size:13px; }
.filtres select { padding:9px 10px; border:1px solid #ddd; border-radius:9px; font-size:13px; background:#fff; }
.cart .mlist { max-height:none; }
.scanwrap { max-width:560px; }
.scancols { display:grid; grid-template-columns:1fr 1fr; gap:22px; align-items:start; }
.scancols > div:last-child { position:sticky; top:112px; max-height:calc(100vh - 130px); overflow-y:auto; overscroll-behavior:contain; }
.lqty { display:flex; align-items:center; gap:7px; font-size:13px; }
.qbtn { width:24px; height:24px; border:1px solid #ddd; background:#fff; border-radius:6px; cursor:pointer; font-size:14px; line-height:1; }
.finalize { border:1px solid #eee; border-radius:12px; padding:14px 16px; margin-top:14px; }
.scanvideo { position:relative; width:100%; aspect-ratio:4/3; background:#0d0d0f; border-radius:14px; overflow:hidden; display:flex; align-items:center; justify-content:center; }
.scanvideo video { width:100%; height:100%; object-fit:cover; }
.scanph { font-size:44px; opacity:.5; }
.scanframe { position:absolute; inset:22% 18%; border:3px solid ${BRAND.blau}; border-radius:12px; box-shadow:0 0 0 4000px rgba(0,0,0,.15); }
.scan { display:flex; align-items:center; border:1px solid #ddd; border-radius:9px; overflow:hidden; }
.scan-ic { padding:0 8px 0 12px; color:${BRAND.blau}; font-size:16px; }
.scan input { border:0; padding:9px 8px; font-size:13px; width:250px; outline:none; flex:1; }
.scan button { border:0; background:${BRAND.negre}; color:#fff; padding:0 16px; cursor:pointer; font-size:13px; align-self:stretch; }
.overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:20; padding:16px; }
.modal { background:#fff; border-radius:14px; padding:20px 22px; width:440px; max-width:100%; max-height:90vh; overflow:auto; }
.modal-h { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
.modal-h h3 { margin:0; font-size:17px; }
.modal-sub { font-size:12px; color:#999; margin:0 0 14px; }
.modal-note { font-size:12.5px; color:#666; background:#faf8f2; border-radius:8px; padding:9px 11px; margin:10px 0 0; }
.modal-act { display:flex; justify-content:flex-end; gap:10px; margin-top:16px; }
.camp { display:block; margin-bottom:11px; }
.camp2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.camp > span { display:block; font-size:12px; color:#777; margin-bottom:4px; font-weight:600; }
.camp input, .camp select, .camp textarea { width:100%; padding:9px 10px; border:1px solid #ddd; border-radius:8px; font-size:13px; font-family:inherit; }
.camp input:disabled, .camp textarea:disabled { background:#f6f6f6; color:#999; }
.check { display:flex; align-items:center; gap:8px; font-size:13px; color:#555; margin:4px 0 11px; }
.btn { border:0; border-radius:9px; padding:10px 16px; font-size:13.5px; font-weight:600; cursor:pointer; }
.btn.sm { padding:7px 12px; font-size:12.5px; }
.btn.prim { background:${BRAND.vermell}; color:#fff; } .btn.prim:disabled { background:#ddd; cursor:not-allowed; }
.btn.ghost { background:#f2f2f2; color:#444; }
.btn.danger { background:${BRAND.vermell}; color:#fff; }
.btn.danger-ghost { background:#fff; color:${BRAND.vermell}; border:1px solid ${BRAND.vermell}; }
.login { display:grid; grid-template-columns:minmax(300px,42%) 1fr; min-height:100vh; }
.login-brand { background:#fafafa; border-right:1px solid #eee; padding:42px 40px; display:flex; flex-direction:column; justify-content:center; gap:26px; position:relative; }
.login-brand:before { content:""; position:absolute; left:0; top:0; bottom:0; width:6px; background:linear-gradient(180deg, ${BRAND.vermell} 0%, ${BRAND.groc} 50%, ${BRAND.blau} 100%); }
.login-claim h2 { margin:0 0 6px; font-size:20px; letter-spacing:-.4px; }
.login-claim p { margin:0; color:#777; font-size:14px; line-height:1.5; }
.login-peu { font-size:12px; color:#aaa; }
.login-form { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 24px; gap:24px; }
.login-box { width:100%; max-width:390px; }
.login-box h1 { margin:0 0 8px; font-size:26px; letter-spacing:-.6px; }
.login-sub { margin:0 0 26px; color:#777; font-size:13.5px; line-height:1.55; }
.btn-google { width:100%; display:flex; align-items:center; justify-content:center; gap:11px; padding:13px 16px; border:1px solid #dcdcdc; background:#fff; border-radius:11px; font-size:14.5px; font-weight:600; cursor:pointer; transition:box-shadow .15s, border-color .15s; }
.btn-google:hover:not(:disabled) { border-color:#bdbdbd; box-shadow:0 2px 10px rgba(0,0,0,.07); }
.btn-google:disabled { opacity:.6; cursor:progress; }
.login-dom { margin-top:12px; font-size:12px; color:#888; text-align:center; line-height:1.5; }
.login-sep { display:flex; align-items:center; gap:12px; margin:24px 0 18px; color:#bbb; font-size:12px; }
.login-sep:before, .login-sep:after { content:""; flex:1; height:1px; background:#ececec; }
.login-link { width:100%; border:0; background:none; color:${BRAND.blau}; font-size:13.5px; font-weight:600; cursor:pointer; padding:6px; }
.login-link:hover { text-decoration:underline; }
.login-alt { border:1px solid #eee; border-radius:12px; padding:16px; }
.login-err { color:${BRAND.vermell}; font-size:12.5px; margin:-4px 0 10px; }
.login-ajuda { margin-top:26px; font-size:12px; color:#999; text-align:center; line-height:1.6; }
.login-foot { font-size:11.5px; color:#bbb; text-align:center; }
.sortir { border:1px solid #e2e2e2; background:#fff; color:#666; border-radius:8px; padding:7px 11px; font-size:12.5px; cursor:pointer; }
.sortir:hover { border-color:${BRAND.vermell}; color:${BRAND.vermell}; }
@media (max-width:760px){ .login{grid-template-columns:1fr;} .login-brand{padding:30px 24px; gap:16px;} .login-brand svg{width:130px;height:auto;} }
.toast { position:fixed; bottom:22px; left:50%; transform:translateX(-50%); background:${BRAND.negre}; color:#fff; padding:12px 20px; border-radius:10px; font-size:13.5px; z-index:40; box-shadow:0 6px 24px rgba(0,0,0,.25); }
.weeknav { display:flex; align-items:center; gap:8px; margin:0 0 12px; }
.wbtn { width:34px; height:34px; border:1px solid #ddd; background:#fff; border-radius:9px; font-size:18px; line-height:1; cursor:pointer; color:${BRAND.negre}; }
.wbtn:disabled { opacity:.35; cursor:not-allowed; }
.wbtn:hover:not(:disabled) { border-color:${BRAND.blau}; color:${BRAND.blau}; }
.wlabel { font-weight:700; font-size:14px; min-width:160px; text-align:center; }
.wtoday { margin-left:6px; border:0; background:#f2f2f2; color:#444; border-radius:8px; padding:8px 12px; font-size:12.5px; cursor:pointer; font-weight:600; }
.week th .thn { font-weight:700; }
.week th .thd { font-size:10px; color:#aaa; font-weight:400; }
.week th .thf { font-size:9.5px; color:${BRAND.vermell}; font-weight:700; margin-top:1px; }
.week th.festiu-h { background:#fdeeee; }
.week th.festiu-h.vac { background:#eef2fb; } .week th.festiu-h.vac .thf { color:#5b76c4; }
.week th.festiu-h.fora { background:#f4f4f4; } .week th.festiu-h.fora .thf { color:#999; }
.week th.festiu-h.lliure .thf { color:#c9932a; }
.week td.festiu { background:#fbeaea; }
.week td.festiu.vac { background:#eef2fb; }
.week td.festiu.fora { background:#f5f5f5; }
@media (max-width:820px){ .espais-layout{flex-direction:column;} .espais-side{width:100%; position:static; max-height:210px; display:flex; flex-wrap:wrap;} .espai-row{width:auto; border:1px solid #eee; border-radius:20px; margin:3px;} .espai-row.on{box-shadow:none; border-color:${BRAND.blau};} .two-col{grid-template-columns:1fr;} .dualcal{grid-template-columns:1fr;} .scan input{width:150px;} .scancols{grid-template-columns:1fr;} .cartcols{grid-template-columns:1fr;} .cart{position:static; max-height:none; overflow:visible;} .scancols > div:last-child{position:static; max-height:none; overflow:visible;} }
`;
