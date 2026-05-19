/**
 * Nuxt capture: иногда вместо </motion.div> попадают </motion.div> — desc-сетка оказывается внутри .row.
 */
function repairContentBlockMotionDivTags(html) {
  const motionClose = String.fromCharCode(60, 47, 109, 111, 116, 105, 111, 110, 46, 100, 105, 118, 62);
  const divClose = String.fromCharCode(60, 47, 100, 105, 118, 62);
  const motionOpen = String.fromCharCode(60, 109, 111, 116, 105, 111, 110, 46, 100, 105, 118, 32);
  const divOpen = String.fromCharCode(60, 100, 105, 118, 32);
  return html.split(motionClose).join(divClose).split(motionOpen).join(divOpen);
}

module.exports = { repairContentBlockMotionDivTags };
