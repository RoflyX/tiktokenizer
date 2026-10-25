import { LandingPage } from "~/seo/LandingPage";
import { landingPaths, landingProps } from "~/seo/static";

export const getStaticPaths = landingPaths("encoding");
export const getStaticProps = landingProps("encoding");
export default LandingPage;
