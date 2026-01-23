import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "3R3BOS.AspectRatioMaster",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "Aspect Ratio Master (3R3BOS)") return;

        const PRESETS = {
            "Speed": {
                video: 0.409600,
                video_ltx: 0.262144,
                image: 0.600000,
                legacy: 0.262144
            },
            "Standard": {
                video: 0.921600,
                video_ltx: 0.856064,
                image: 1.048576,
                image_hunyuan: 4.194304,
                legacy: 0.262144
            },
            "Labs": {
                "video_qhd": 0.522240,
                "video_ltx": 1.048576,
                "video_dvd": 0.345600,
                "image_eco": 1.500000,
                "image_pony": 1.254400,
                "legacy": 0.393216
            }
        };

        function getArchType(name) {
            if (name.includes("LTX")) return "video_ltx";
            if (name.includes("Hunyuan Image 2.1")) return "image_hunyuan";
            if (name.includes("CogVideo")) return "video_dvd";
            if (name.includes("Wan") || name.includes("Hunyuan") || name.includes("Mochi") || name.includes("HiDream")) return "video_qhd";
            if (name.includes("SDXL") || name.includes("Pony") || name.includes("Kolors") || name.includes("Illustrious")) return "image_pony";
            if (name.includes("SD 1.5")) return "legacy";
            return "image_eco";
        }

        function getRes(arch, mode, ratioStr, scale) {
            const archType = getArchType(arch);

            let mKey = "Standard";
            if (mode.includes("Speed")) mKey = "Speed";
            else if (mode.includes("Labs") || mode.includes("Community")) mKey = "Labs";

            const presetGroup = PRESETS[mKey];
            let mp = 1.0;

            // Priority: Exact Key -> Generic Key
            if (presetGroup[archType] !== undefined) {
                mp = presetGroup[archType];
            } else {
                let genType = "image";
                if (archType.includes("video")) genType = "video";
                if (archType.includes("legacy")) genType = "legacy";
                mp = presetGroup[genType] || 1.0;
            }

            mp = mp * (scale * scale);

            const p = ratioStr.split(':');
            const rw = parseFloat(p[0]);
            const rh = parseFloat(p[1]);
            const total = mp * 1000000;
            const s = Math.sqrt(total / (rw * rh));

            // ROUNDING LOGIC (Mod 32 for LTX/Cog, Mod 16 for others)
            let r = 16;
            if (archType === "video_ltx" || archType === "video_dvd") r = 32;

            // Sync with Python constraints:
            if (arch.includes("SDXL") || arch.includes("Pony")) r = 8;
            if (arch.includes("SD 1.5")) r = 8;
            if (arch.includes("Wan") || arch.includes("Flux")) r = 16;
            if (arch.includes("SD 3.5")) r = 64;

            const w = Math.round((s * rw) / r) * r;
            const h = Math.round((s * rh) / r) * r;

            return { w, h, mode: mKey };
        }

        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            if (onNodeCreated) onNodeCreated.apply(this, arguments);
            this.setSize([380, 600]);
            const refresh = () => { this.setDirtyCanvas(true, true); };
            this.widgets.forEach(w => {
                const cb = w.callback;
                w.callback = (v) => { if (cb) cb(v); refresh(); };
            });
        };

        const onDrawForeground = nodeType.prototype.onDrawForeground;
        nodeType.prototype.onDrawForeground = function (ctx) {
            if (onDrawForeground) onDrawForeground.apply(this, arguments);
            if (this.flags.collapsed) return;

            const wArch = this.widgets.find(w => w.name === "model_arch");
            const wMode = this.widgets.find(w => w.name === "performance_mode");
            const wRatio = this.widgets.find(w => w.name === "aspect_ratio");
            const wScale = this.widgets.find(w => w.name === "custom_scale_factor");

            const arch = wArch ? wArch.value : "Wan";
            const mode = wMode ? wMode.value : "Standard";
            const curRatio = wRatio ? wRatio.value : "16:9";
            const scale = wScale ? wScale.value : 1.0;

            const margin = 10;
            const topY = 320;
            const gw = this.size[0] - margin * 2;
            const gh = this.size[1] - topY - 10;
            const cw = gw / 3; const ch = gh / 3;

            const RATIOS = [
                { l: "1:1", v: "1:1" }, { l: "4:3", v: "4:3" }, { l: "3:4", v: "3:4" },
                { l: "16:9", v: "16:9" }, { l: "9:16", v: "9:16" }, { l: "21:9", v: "21:9" },
                { l: "9:21", v: "9:21" }, { l: "3:2", v: "3:2" }, { l: "2:3", v: "2:3" }
            ];

            this.hitBoxes = [];
            ctx.save();
            ctx.translate(margin, topY);

            RATIOS.forEach((r, i) => {
                const col = i % 3; const row = Math.floor(i / 3);
                const x = col * cw; const y = row * ch;

                const res = getRes(arch, mode, r.v, scale);
                const active = curRatio.startsWith(r.v);

                this.hitBoxes.push({
                    val: r.v, l: margin + x, t: topY + y, r: margin + x + cw, b: topY + y + ch
                });

                ctx.beginPath();
                ctx.roundRect(x + 2, y + 2, cw - 4, ch - 4, 4);

                if (active) {
                    ctx.fillStyle = "rgba(0, 255, 136, 0.2)";
                    ctx.strokeStyle = "#00FF88"; ctx.lineWidth = 2;
                } else if (res.mode === "Labs") {
                    ctx.fillStyle = "rgba(255, 0, 255, 0.05)";
                    ctx.strokeStyle = "rgba(255, 0, 255, 0.3)"; ctx.lineWidth = 1;
                } else if (res.mode === "Speed") {
                    ctx.fillStyle = "rgba(255, 255, 0, 0.05)";
                    ctx.strokeStyle = "rgba(255, 255, 0, 0.3)"; ctx.lineWidth = 1;
                } else {
                    ctx.fillStyle = "rgba(0,0,0,0.2)";
                    ctx.strokeStyle = "#333"; ctx.lineWidth = 1;
                }
                ctx.fill(); ctx.stroke();

                const cx = x + cw / 2; const cy = y + ch / 2;
                ctx.textAlign = "center";

                ctx.fillStyle = active ? "#fff" : "#888";
                ctx.font = active ? "bold 13px Arial" : "12px Arial";
                ctx.fillText(r.l, cx, cy - 5);

                let resCol = "#555";
                if (active) resCol = "#00FF88";
                else if (res.mode === "Labs") resCol = "#ff55ff";
                else if (res.mode === "Speed") resCol = "#ffff55";

                ctx.fillStyle = resCol;
                ctx.font = "10px Consolas";
                ctx.fillText(`${res.w}x${res.h}`, cx, cy + 12);
            });
            ctx.restore();
        };

        nodeType.prototype.onMouseDown = function (e, pos) {
            if (e.buttons !== 1) return false;
            const x = pos[0]; const y = pos[1];
            if (this.hitBoxes) {
                for (const h of this.hitBoxes) {
                    if (x >= h.l && x <= h.r && y >= h.t && y <= h.b) {
                        const w = this.widgets.find(w => w.name === "aspect_ratio");
                        if (w) {
                            const opt = w.options.values.find(v => v.startsWith(h.val));
                            if (opt) { w.value = opt; w.callback(opt); }
                        }
                        return true;
                    }
                }
            }
        };
    }
});
