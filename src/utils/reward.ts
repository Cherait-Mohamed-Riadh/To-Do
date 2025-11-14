export function playBeepSimple(frequency = 1046.5, durationSec = 0.22, type: OscillatorType = "triangle", gainPeak = 0.12) {
	try {
		const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
		const oscillator = ctx.createOscillator();
		const gain = ctx.createGain();
		oscillator.type = type;
		oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
		gain.gain.setValueAtTime(0.0001, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(gainPeak, ctx.currentTime + 0.01);
		gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + Math.max(0.05, durationSec));
		oscillator.connect(gain).connect(ctx.destination);
		oscillator.start();
		oscillator.stop(ctx.currentTime + durationSec + 0.02);
	} catch {
		// ignore audio issues
	}
}

export async function celebrateConfetti(options?: {
	particleCount?: number;
	spread?: number;
	startVelocity?: number;
	origin?: { x?: number; y?: number };
	withBeep?: boolean;
}) {
	const { withBeep = true } = options ?? {};
	if (withBeep) {
		playBeepSimple(1046.5, 0.22, "triangle", 0.12);
	}
	try {
		const mod: any = await import("canvas-confetti");
		const confettiFn = mod?.default || mod;
		confettiFn?.({
			particleCount: options?.particleCount ?? 90,
			spread: options?.spread ?? 70,
			startVelocity: options?.startVelocity ?? 40,
			origin: options?.origin ?? { y: 0.6 }
		});
	} catch {
		// if library failed to load, we already played the beep
	}
}










