from pix2text import Pix2Text

img_fp = 'examples/formula2.png'
p2t = Pix2Text.from_config()
out =p2t.recognize_formula(
    img_fp,
    save_analysis_res='output-debug',
)