package ch.utou.confluence.plugins.tiddlywiki.macros;

import java.util.*;
import com.atlassian.renderer.RenderContext;
import com.atlassian.renderer.v2.RenderMode;
import com.atlassian.renderer.v2.macro.BaseMacro;
import com.atlassian.renderer.v2.macro.MacroException;
import com.atlassian.confluence.util.velocity.VelocityUtils;
import com.atlassian.confluence.renderer.PageContext;
import com.atlassian.confluence.renderer.radeox.macros.MacroUtils;
import com.opensymphony.webwork.ServletActionContext;
import com.atlassian.confluence.setup.BootstrapManager;
import com.atlassian.confluence.spaces.Space;
import com.atlassian.confluence.spaces.SpaceManager;
import com.atlassian.confluence.core.ConfluenceActionSupport;
import com.atlassian.confluence.util.GeneralUtil;

/**
 * Macro to provide a space export form for TiddlyWiki
 *
 */
public class TiddlyWikiMacro extends BaseMacro {

	private ConfluenceActionSupport confluenceActionSupport;
	
	private SpaceManager spaceManager;
	public void setSpaceManager(SpaceManager manager) {	this.spaceManager = manager; }
	
	private BootstrapManager bootstrapManager;
	public void setBootstrapManager(BootstrapManager manager) { this.bootstrapManager = manager; }
	
	public boolean isInline() {
		return false;
	}

	public boolean hasBody() {
		return false;
	}

	public RenderMode getBodyRenderMode() {
		return RenderMode.NO_RENDER;
	}

	public String execute(Map parameters, String body,
			RenderContext renderContext) throws MacroException {
		
		// Default context
		Map contextMap = MacroUtils.defaultVelocityContext();
		
		// Determine the space
		String spaceKey = "";
		if (parameters.containsKey("space"))
			spaceKey = (String) parameters.get("space");
		else if (renderContext instanceof PageContext)
			spaceKey = ((PageContext) renderContext).getSpaceKey();

		// TODO: Optional start page parameter
		// if (parameters.containsKey("page"))

		// Create link to the action servlet
		String linkUrl = "/plugins/tiddlywiki/tiddlywiki.action?";
		
		// Add base path to the Confluence instance
		linkUrl = bootstrapManager.getWebAppContextPath() + linkUrl;
		
		// Add space key
		linkUrl += "key=" + spaceKey;
		contextMap.put("linkUrl", linkUrl);
		
		// Optional link title parameter
		boolean defaultTitle = true;
		if (parameters.containsKey("title")) {
			contextMap.put("linkTitle", parameters.get("title"));
			defaultTitle = false;
		} else {
			contextMap.put("linkTitle", getText("tiddlywiki.macro.title"));
		}
		contextMap.put("defaultTitle", defaultTitle);
						
		// Render Velocity template
		return VelocityUtils.getRenderedTemplate(
				"/templates/macros/tiddlymacro.vm",
				contextMap);
	}

	public void setConfluenceActionSupport(ConfluenceActionSupport confluenceActionSupport) {
		this.confluenceActionSupport = confluenceActionSupport;
	}
	
	protected ConfluenceActionSupport getConfluenceActionSupport() {
        if (null == confluenceActionSupport)
            confluenceActionSupport = GeneralUtil.newWiredConfluenceActionSupport();
        return confluenceActionSupport;
    }

	public String getText(String key) {
        String result = key;
        if (getConfluenceActionSupport() != null) {
            result = confluenceActionSupport.getText(key);
        }
        return result;
    }

}
