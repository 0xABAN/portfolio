"use client";

import { useEffect, useRef } from "react";
import { fractureOffset } from "./desktopParallax";

const PIECES = [
	"northwest", "north", "northeast", "upper-right", "right",
	"southeast", "south", "southwest", "left",
];

export function FractureBackground() {
	const svgRef = useRef<SVGSVGElement>(null);

	useEffect(() => {
		const svg = svgRef.current;
		const desktop = svg?.parentElement;
		if (!svg || !desktop) return;
		const motion = window.matchMedia(
			"(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
		);
		const pieces = [...svg.querySelectorAll<SVGGElement>(".fracture-piece")].map((element) => ({
			element,
			// ponytail: 16-unit outline samples; densify if tiny fragments need finer targeting.
			outline: [...svg.querySelectorAll<SVGPathElement>(`#fracture-${element.dataset.piece} path`)].flatMap((path) => {
				const length = path.getTotalLength();
				const steps = Math.max(1, Math.ceil(length / 16));
				return Array.from({ length: steps + 1 }, (_, i) => path.getPointAtLength((length * i) / steps));
			}),
		}));
		let frame = 0;
		let pointer: DOMPoint | null = null;

		function reset() {
			window.cancelAnimationFrame(frame);
			frame = 0;
			pointer = null;
			for (const { element } of pieces) element.style.removeProperty("transform");
		}

		function move(event: PointerEvent) {
			if (!motion.matches || event.pointerType !== "mouse") {
				reset();
				return;
			}
			pointer = new DOMPoint(event.clientX, event.clientY);
			if (frame) return;
			frame = window.requestAnimationFrame(() => {
				frame = 0;
				const matrix = svg?.getScreenCTM();
				if (!matrix || !pointer) return;
				const point = pointer.matrixTransform(matrix.inverse());
				const scale = Math.hypot(matrix.a, matrix.b);
				for (const { element, outline } of pieces) {
					const { x, y } = fractureOffset(point, outline, scale);
					const transform = x === 0 && y === 0 ? "" : `translate(${x}px, ${y}px)`;
					if (element.style.transform !== transform) element.style.transform = transform;
				}
			});
		}

		desktop.addEventListener("pointermove", move, { passive: true });
		desktop.addEventListener("pointerleave", reset);
		window.addEventListener("blur", reset);
		window.addEventListener("resize", reset);
		motion.addEventListener("change", reset);
		return () => {
			reset();
			desktop.removeEventListener("pointermove", move);
			desktop.removeEventListener("pointerleave", reset);
			window.removeEventListener("blur", reset);
			window.removeEventListener("resize", reset);
			motion.removeEventListener("change", reset);
		};
	}, []);

	return (
		<svg ref={svgRef} className="desktop__fracture" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true" focusable="false">
			<defs>
				<radialGradient id="falloff">
					<stop offset="0" stopColor="white"/>
					{/* Keep the impact opaque as nearby branches move underneath it. */}
					<stop offset=".08" stopColor="white"/>
					<stop offset=".48" stopColor="white" stopOpacity=".9"/>
					<stop offset=".82" stopColor="white" stopOpacity=".5"/>
					<stop offset="1" stopColor="white" stopOpacity="0"/>
				</radialGradient>
				<mask id="screen" maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="1000">
					<ellipse cx="800" cy="500" rx="950" ry="660" fill="url(#falloff)"/>
				</mask>
				<linearGradient id="phosphor" x1="0" y1="0" x2="0" y2="1000" gradientUnits="userSpaceOnUse">
					<stop stopColor="#af0000" stopOpacity=".1"/>
					<stop offset=".35" stopColor="#c30000" stopOpacity=".16"/>
					<stop offset=".52" stopColor="#830000" stopOpacity=".2"/>
					<stop offset=".7" stopColor="#bc0000" stopOpacity=".12"/>
					<stop offset="1" stopColor="#af0000" stopOpacity="0"/>
				</linearGradient>
				<pattern id="pixels" width="6" height="5" patternUnits="userSpaceOnUse">
					<path d="M0 0H6M0 0V5" stroke="#340000" strokeOpacity=".35"/>
					<path d="M1 1H5" stroke="#df0000" strokeOpacity=".22"/>
					<path d="M2 2V4" stroke="#c60000" strokeOpacity=".16"/>
				</pattern>
				<pattern id="columns" width="106" height="1000" patternUnits="userSpaceOnUse">
					<path d="M3 0V1000M12 0V1000M68 0V1000" stroke="#d00000" strokeWidth="2" strokeOpacity=".25"/>
					<path d="M25 0V1000M78 0V1000" stroke="#460000" strokeWidth="5" strokeOpacity=".35"/>
					<path d="M50 0V1000" stroke="#e00000" strokeWidth="9" strokeOpacity=".1"/>
				</pattern>
				<filter id="rough" filterUnits="userSpaceOnUse" x="-80" y="-50" width="1760" height="1100" colorInterpolationFilters="sRGB">
					<feTurbulence type="fractalNoise" baseFrequency=".045 .12" numOctaves="2" seed="17" result="noise"/>
					<feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="G"/>
				</filter>
				<filter id="signal" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
					<feTurbulence type="fractalNoise" baseFrequency=".012 .26" numOctaves="2" seed="8"/>
					<feColorMatrix type="matrix" values="0 0 0 0 .7  0 0 0 0 0  0 0 0 0 0  0 0 0 .6 -.16"/>
				</filter>
				<g id="fractures">
					<g id="fracture-northwest">
						<path d="M800 500 736 480 699 469 661 458 607 438 548 412 515 397 456 352 398 328 348 292 295 270 247 229 166 176 92 96 0 32 119 97 216 143 297 180 353 185 403 235 477 267 502 290 540 304 566 353 630 400 690 426 750 453Z"/>
						<path d="M558 384 521 339 505 294 485 230 469 177 455 107 402 32 460 99 482 148 500 171 511 224 534 251 539 292 557 314 573 366Z"/>
					</g>
					<g id="fracture-north">
						<path d="M800 500 789 455 768 417 776 377 762 361 755 324 766 313 769 286 781 300 796 296 792 329 807 345 794 374 790 409 808 455Z"/>
					</g>
					<g id="fracture-northeast">
						<path d="M809 499 839 451 891 400 909 370 935 343 974 298 987 276 1000 252 997 285 975 323 950 340 947 365 922 387 912 411 862 461 834 490Z"/>
					</g>
					<g id="fracture-upper-right">
						<path d="M805 499 865 467 914 441 984 401 1025 374 1063 382 1077 370 1092 375 1101 359 1165 340 1203 335 1253 288 1305 280 1344 262 1417 235 1600 170 1472 225 1419 242 1378 273 1315 302 1276 308 1234 356 1218 357 1214 372 1170 381 1144 386 1143 400 1105 405 1104 415 1059 409 1025 410 980 440 930 468 874 491Z"/>
						<path d="M1178 350 1171 315 1194 287 1209 230 1249 180 1266 124 1249 204 1241 256 1212 310 1213 343Z"/>
					</g>
					<g id="fracture-right">
						<path d="M812 504 908 503 974 495 1002 492 1042 477 1085 465 1092 451 1118 458 1128 450 1152 465 1193 461 1252 477 1302 462 1254 484 1195 470 1151 479 1142 487 1127 479 1105 485 1080 479 1044 484 1002 497 975 500 909 508Z"/>
						<path d="m1378 467 24-12 22 6 13-8 24 16 43-2 42 13 54-4-59 10-39-12-47 4-22-8-8 11-21-8-26 9Z"/>
					</g>
					<g id="fracture-southeast">
						<path d="M800 500 856 531 913 557 953 592 1008 615 1034 645 1080 651 1108 677 1137 680 1145 716 1184 735 1229 786 1281 806 1305 837 1369 873 1410 915 1454 941 1493 980 1550 1000 1480 982 1431 954 1375 932 1333 892 1285 871 1247 834 1201 821 1172 796 1128 784 1109 753 1064 738 1042 700 1010 690 997 662 951 636 915 597 866 570 840 537Z"/>
						<path d="M1111 753 1150 768 1201 762 1242 780 1305 786 1350 815 1436 831 1495 866 1427 840 1344 826 1301 799 1238 799 1196 782 1159 788 1128 784Z"/>
					</g>
					<g id="fracture-south">
						<path d="M808 521 813 579 834 626 827 666 848 716 840 748 845 777 828 807 838 854 830 899 857 955 865 1000 852 956 824 900 831 854 820 811 817 785 829 757 825 734 833 716 818 666 827 627 807 580 803 523Z"/>
					</g>
					<g id="fracture-southwest">
						<path d="M787 513 736 553 711 583 660 606 637 636 603 653 587 681 551 685 530 711 495 714 471 741 438 748 417 774 372 798 407 766 421 736 460 720 479 691 518 673 552 666 579 643 619 626 645 594 692 580 721 549 769 518Z"/>
						<path d="M554 675 565 716 546 742 554 773 531 791 520 824 514 788 533 769 522 741 543 710 539 683Z"/>
					</g>
					<g id="fracture-left">
						<path d="M800 503 746 514 698 511 646 505 602 529 570 526 553 516 521 505 487 521 452 519 441 538 416 542 401 529 365 531 331 512 288 516 243 503 180 518 122 515 71 541 0 542 72 535 121 507 178 511 243 494 292 508 334 503 368 520 396 519 410 510 432 521 447 511 483 513 521 492 554 506 575 516 600 520 645 496 699 504 746 507Z"/>
					</g>
					<path id="fracture-impact" d="M791 469 807 475 821 467 825 488 844 499 827 513 826 530 806 521 793 538 782 515 759 509 777 489 776 472Z"/>
				</g>
			</defs>
			<g mask="url(#screen)">
				<path fill="url(#phosphor)" d="M0 0H1600V1000H0Z"/>
				<g fill="url(#columns)">
					<path opacity=".75" d="M25 20H625V259H25Z"/>
					<path opacity=".55" d="M75 559H673V990H75Z"/>
					<path opacity=".4" d="M965 55H1580V328H965Z"/>
					<path opacity=".65" d="M1114 603H1580V990H1114Z"/>
				</g>
				<g strokeLinecap="square">
					<path d="M18 268H436M445 271H605M991 332H1548M34 689H473M1132 755H1583" stroke="#d20000" strokeWidth="4" opacity=".3"/>
					<path d="M0 284H543M1018 343H1600M0 703H521M1162 771H1600" stroke="#3d0000" strokeWidth="7" opacity=".5"/>
					<path d="M42 298H460M1251 361H1540M78 719H492M1290 786H1593" stroke="#df0000" strokeWidth="2" opacity=".4"/>
					<path d="M352 76V294M404 112V336M1227 628V949M1336 765V997" stroke="#ba0000" strokeWidth="3" opacity=".4"/>
				</g>
				<path fill="url(#pixels)" d="M0 0H1600V1000H0Z"/>
				<path filter="url(#signal)" opacity=".6" d="M0 0H1600V1000H0Z"/>
			</g>
			{/* Separate masks/filters prevent moving bounds from resampling the static screen. */}
			{PIECES.map((piece) => (
				<g key={piece} mask="url(#screen)">
					<g className="fracture-piece" data-piece={piece}>
						<g filter="url(#rough)">
							<use href={`#fracture-${piece}`} fill="#df0000" stroke="#df0000" strokeWidth="2" opacity=".3" transform="translate(-2 1)"/>
							<use href={`#fracture-${piece}`} fill="#120000"/>
						</g>
					</g>
				</g>
			))}
			<g mask="url(#screen)">
				<g filter="url(#rough)">
					<use href="#fracture-impact" fill="#df0000" stroke="#df0000" strokeWidth="2" opacity=".3" transform="translate(-2 1)"/>
					<use href="#fracture-impact" fill="#120000"/>
					<g stroke="#210000" strokeWidth="1.5">
						<path d="M607 438 552 446 504 471 432 463 369 481 312 473 236 496M455 107 477 63 469 0"/>
						<path d="M769 286 743 233 752 184 721 133 710 71 679 0M1000 252 1031 214 1041 178 1087 139 1121 66 1175 0"/>
						<path d="M1344 262 1330 218 1359 185 1364 129 1401 91M1302 462 1337 445 1378 467"/>
						<path d="M1145 716 1208 687 1255 694 1293 672 1362 677 1418 651 1498 664 1555 642"/>
						<path d="M1247 834 1227 878 1239 912 1231 956 1254 1000M840 748 881 770 909 811 953 823 984 872"/>
						<path d="M417 774 367 771 313 799 257 794 205 823 148 831 100 867M520 824 494 874 503 908 470 955 474 1000"/>
						<path d="M243 503 207 469 178 463 152 428 89 407 51 365 0 351M487 521 467 558 439 572 413 605"/>
					</g>
					<g fill="#240000">
						<path d="m452 232 16-9 9 18-6 14-18-4Zm-17 335 12-16 19 4 3 20-16 12-21-4Zm188 196 22 2 4 21-13 12-18-15Zm445-526 19-11 12 21-8 23-19-8Zm139 335 14-9 12 12-2 20-20 5Zm187-225 18 4-1 21-17 6-8-12ZM969 851l17-10 16 14-4 20-21 4-10-13ZM298 126l8-7 14 11-5 19-16-3Z"/>
						<path d="m484 219 8-5 7 10-7 7Zm-21 330 9-3 5 12-10 5Zm176 253 7-4 9 10-8 7Zm462-526 10-7 4 13-7 7Zm130 269 8-2 4 12-10 3Zm190-213 7-6 7 10-5 8ZM945 826l9-2 7 10-9 6Z"/>
					</g>
				</g>
				<g stroke="#dc0000" strokeOpacity=".25">
					<path d="M247 229 295 270 348 292M477 267l25 23 38 14M1025 374l38 8 14-12M1253 288l52-8 39-18M1034 645l46 6 28 26M1172 796l29 25 46 13M637 636l-34 17-16 28M471 741l-33 7-21 26M521 505l-34 16-35-2"/>
				</g>
			</g>
		</svg>
	);
}
