import { LandingPage } from "~/seo/LandingPage";
import { landingPaths, landingProps } from "~/seo/static";

export const getStaticPaths = landingPaths("model");
export const getStaticProps = landingProps("model");
export default LandingPage;
